import os
import sys
import tempfile
import pandas as pd
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_processing.data_loader import TrafficDataProcessor
from prediction_service.predictor import PredictionService

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['JSON_AS_ASCII'] = False

@app.before_request
def before_request():
    if request.path.startswith('/api/'):
        pass

@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': '接口不存在'}), 404
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal error: {error}")
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': '服务器内部错误'}), 500
    return "Internal Server Error", 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'success': False, 'error': '文件过大，最大支持100MB'}), 413

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Unhandled exception: {e}")
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': str(e)}), 500
    return "Internal Server Error", 500

prediction_service = PredictionService(model_dir='saved_models', device='cpu')
data_processor = TrafficDataProcessor()
current_data_df = None
current_file_path = None

ALLOWED_EXTENSIONS = {'csv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/intersections', methods=['GET'])
def get_intersections():
    intersections = prediction_service.get_intersection_ids()
    return jsonify({
        'success': True,
        'intersections': intersections
    })


@app.route('/api/upload', methods=['POST'])
def upload_file():
    global current_data_df, current_file_path
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': '未找到文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': '未选择文件'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        try:
            df = data_processor.load_csv(filepath)
            current_data_df = df
            current_file_path = filepath
            return jsonify({
                'success': True,
                'message': '文件上传成功',
                'filename': filename,
                'total_records': len(df),
                'intersections': sorted(df['intersection_id'].unique().tolist()),
                'date_range': {
                    'start': df['timestamp'].min().strftime('%Y-%m-%d %H:%M:%S'),
                    'end': df['timestamp'].max().strftime('%Y-%m-%d %H:%M:%S')
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': f'文件解析失败: {str(e)}'}), 400
    return jsonify({'success': False, 'error': '不支持的文件格式'}), 400


@app.route('/api/predict', methods=['POST'])
def predict():
    global current_data_df
    if current_data_df is None:
        return jsonify({'success': False, 'error': '请先上传数据文件'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '请求数据为空'}), 400
    intersection_id = data.get('intersection_id')
    target_time_str = data.get('target_time')
    if not intersection_id:
        return jsonify({'success': False, 'error': '请选择路口ID'}), 400
    if not target_time_str:
        return jsonify({'success': False, 'error': '请选择预测时间'}), 400
    try:
        target_time = datetime.strptime(target_time_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return jsonify({'success': False, 'error': '时间格式错误'}), 400
    result = prediction_service.predict_next_hour(current_data_df, intersection_id, target_time)
    if 'error' in result:
        return jsonify({'success': False, 'error': result['error']}), 400
    return jsonify({
        'success': True,
        'prediction': result
    })


@app.route('/api/predict_range', methods=['POST'])
def predict_range():
    global current_data_df
    if current_data_df is None:
        return jsonify({'success': False, 'error': '请先上传数据文件'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '请求数据为空'}), 400
    intersection_id = data.get('intersection_id')
    start_time_str = data.get('start_time')
    hours = data.get('hours', 24)
    if not intersection_id:
        return jsonify({'success': False, 'error': '请选择路口ID'}), 400
    if not start_time_str:
        return jsonify({'success': False, 'error': '请选择开始时间'}), 400
    try:
        start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return jsonify({'success': False, 'error': '时间格式错误'}), 400
    result = prediction_service.predict_next_hours(current_data_df, intersection_id, start_time, hours)
    if 'error' in result:
        return jsonify({'success': False, 'error': result['error']}), 400
    return jsonify({
        'success': True,
        'predictions': result
    })


@app.route('/api/historical', methods=['GET'])
def get_historical():
    global current_data_df
    if current_data_df is None:
        return jsonify({'success': False, 'error': '请先上传数据文件'}), 400
    intersection_id = request.args.get('intersection_id')
    hours = int(request.args.get('hours', 168))
    if not intersection_id:
        return jsonify({'success': False, 'error': '请选择路口ID'}), 400
    data = prediction_service.get_historical_data(current_data_df, intersection_id, hours)
    return jsonify({
        'success': True,
        'intersection_id': intersection_id,
        'historical_data': data
    })


@app.route('/api/available_times', methods=['GET'])
def get_available_times():
    global current_data_df
    if current_data_df is None:
        return jsonify({'success': False, 'error': '请先上传数据文件'}), 400
    intersection_id = request.args.get('intersection_id')
    if not intersection_id:
        return jsonify({'success': False, 'error': '请选择路口ID'}), 400
    times = prediction_service.get_available_prediction_times(current_data_df, intersection_id)
    return jsonify({
        'success': True,
        'intersection_id': intersection_id,
        'available_times': times
    })


@app.route('/api/model_info', methods=['GET'])
def get_model_info():
    intersection_id = request.args.get('intersection_id')
    if not intersection_id:
        return jsonify({'success': False, 'error': '请选择路口ID'}), 400
    info = prediction_service.get_model_info(intersection_id)
    if info is None:
        return jsonify({'success': False, 'error': f'未找到路口 {intersection_id} 的模型信息'}), 404
    return jsonify({
        'success': True,
        'model_info': info
    })


@app.route('/api/data_status', methods=['GET'])
def get_data_status():
    global current_data_df, current_file_path
    if current_data_df is None:
        return jsonify({
            'success': True,
            'has_data': False
        })
    return jsonify({
        'success': True,
        'has_data': True,
        'filename': os.path.basename(current_file_path) if current_file_path else None,
        'total_records': len(current_data_df),
        'intersections': sorted(current_data_df['intersection_id'].unique().tolist()),
        'date_range': {
            'start': current_data_df['timestamp'].min().strftime('%Y-%m-%d %H:%M:%S'),
            'end': current_data_df['timestamp'].max().strftime('%Y-%m-%d %H:%M:%S')
        }
    })


if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.info("启动交通流量预测系统服务器...")
    logger.info("请在浏览器中访问: http://127.0.0.1:8000")
    try:
        app.run(debug=False, host='0.0.0.0', port=8000, use_reloader=False, threaded=True)
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
        import traceback
        traceback.print_exc()
