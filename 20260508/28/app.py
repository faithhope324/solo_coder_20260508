from flask import Flask, render_template, request, jsonify, send_from_directory, url_for
from werkzeug.utils import secure_filename
import numpy as np
from scipy.integrate import odeint
import os
import uuid
import threading
import time
from style_transfer import run_style_transfer, run_fast_style_transfer, get_model_status

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
RESULT_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULT_FOLDER'] = RESULT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

tasks = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def lorenz_system(state, t, sigma, rho, beta):
    x, y, z = state
    dx_dt = sigma * (y - x)
    dy_dt = x * (rho - z) - y
    dz_dt = x * y - beta * z
    return [dx_dt, dy_dt, dz_dt]


def solve_lorenz(sigma, rho, beta, x0, y0, z0, t_start, t_end, num_points=10000):
    t = np.linspace(t_start, t_end, num_points)
    initial_state = [x0, y0, z0]
    solution = odeint(lorenz_system, initial_state, t, args=(sigma, rho, beta))
    return t, solution


def process_style_transfer(task_id, content_path, style_path, output_path, mode='fast',
                           num_steps=200, style_weight=10000, content_weight=1):
    try:
        tasks[task_id]['status'] = 'processing'
        tasks[task_id]['progress'] = 0
        tasks[task_id]['step'] = 0
        tasks[task_id]['total_steps'] = num_steps

        def progress_callback(progress, step, total):
            tasks[task_id]['progress'] = progress
            tasks[task_id]['step'] = step
            tasks[task_id]['total_steps'] = total

        if mode == 'quality':
            run_style_transfer(
                content_path, style_path, output_path,
                num_steps=num_steps,
                style_weight=style_weight,
                content_weight=content_weight,
                progress_callback=progress_callback
            )
        else:
            run_fast_style_transfer(
                content_path, style_path, output_path,
                num_steps=num_steps,
                style_weight=style_weight,
                content_weight=content_weight,
                progress_callback=progress_callback
            )

        tasks[task_id]['status'] = 'completed'
        tasks[task_id]['progress'] = 100
        tasks[task_id]['result_url'] = url_for('download_result', filename=os.path.basename(output_path))
    except Exception as e:
        tasks[task_id]['status'] = 'failed'
        tasks[task_id]['error'] = str(e)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/style-transfer')
def style_transfer_page():
    return render_template('style_transfer.html')


@app.route('/model-status', methods=['GET'])
def model_status():
    return jsonify(get_model_status())


@app.route('/preload-model', methods=['POST'])
def preload_model():
    try:
        from style_transfer import get_vgg19
        get_vgg19()
        return jsonify({'status': 'success', 'message': '模型加载完成'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/solve', methods=['POST'])
def solve():
    data = request.get_json()

    sigma = float(data.get('sigma', 10.0))
    rho = float(data.get('rho', 28.0))
    beta = float(data.get('beta', 8.0 / 3.0))
    x0 = float(data.get('x0', 1.0))
    y0 = float(data.get('y0', 1.0))
    z0 = float(data.get('z0', 1.0))
    t_start = float(data.get('t_start', 0.0))
    t_end = float(data.get('t_end', 50.0))

    t, solution = solve_lorenz(sigma, rho, beta, x0, y0, z0, t_start, t_end)

    return jsonify({
        't': t.tolist(),
        'x': solution[:, 0].tolist(),
        'y': solution[:, 1].tolist(),
        'z': solution[:, 2].tolist()
    })


@app.route('/upload', methods=['POST'])
def upload_files():
    status = get_model_status()
    if not status['loaded']:
        if status['loading']:
            return jsonify({'error': 'VGG19模型正在加载中，请稍候再试...'}), 503
        return jsonify({'error': 'VGG19模型尚未加载，请先点击"预加载模型"按钮'}), 503

    if 'content' not in request.files or 'style' not in request.files:
        return jsonify({'error': '缺少内容图片或风格图片'}), 400

    content_file = request.files['content']
    style_file = request.files['style']

    if content_file.filename == '' or style_file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    if not (allowed_file(content_file.filename) and allowed_file(style_file.filename)):
        return jsonify({'error': '不支持的文件格式，请上传PNG或JPG图片'}), 400

    task_id = str(uuid.uuid4())

    content_ext = content_file.filename.rsplit('.', 1)[1].lower()
    style_ext = style_file.filename.rsplit('.', 1)[1].lower()

    content_filename = f"{task_id}_content.{content_ext}"
    style_filename = f"{task_id}_style.{style_ext}"
    output_filename = f"{task_id}_result.png"

    content_path = os.path.join(app.config['UPLOAD_FOLDER'], content_filename)
    style_path = os.path.join(app.config['UPLOAD_FOLDER'], style_filename)
    output_path = os.path.join(app.config['RESULT_FOLDER'], output_filename)

    content_file.save(content_path)
    style_file.save(style_path)

    mode = request.form.get('mode', 'fast')
    num_steps = int(request.form.get('num_steps', 200))
    style_weight = float(request.form.get('style_weight', 10000))
    content_weight = float(request.form.get('content_weight', 1))

    tasks[task_id] = {
        'id': task_id,
        'status': 'pending',
        'progress': 0,
        'content_path': content_path,
        'style_path': style_path,
        'output_path': output_path
    }

    thread = threading.Thread(
        target=process_style_transfer,
        args=(task_id, content_path, style_path, output_path, mode, num_steps, style_weight, content_weight)
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        'task_id': task_id,
        'message': '任务已开始处理'
    })


@app.route('/progress/<task_id>', methods=['GET'])
def get_progress(task_id):
    if task_id not in tasks:
        return jsonify({'error': '任务不存在'}), 404

    task = tasks[task_id]
    return jsonify({
        'task_id': task_id,
        'status': task['status'],
        'progress': task.get('progress', 0),
        'step': task.get('step', 0),
        'total_steps': task.get('total_steps', 0),
        'result_url': task.get('result_url'),
        'error': task.get('error')
    })


@app.route('/results/<filename>', methods=['GET'])
def download_result(filename):
    return send_from_directory(app.config['RESULT_FOLDER'], filename, as_attachment=False)


@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['RESULT_FOLDER'], filename, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
