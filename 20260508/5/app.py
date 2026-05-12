from flask import Flask, request, jsonify, render_template, send_file
from celery import Celery
import os
import tempfile
import redis

app = Flask(__name__)

# 配置Celery
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# 连接Redis用于存储进度
redis_client = redis.Redis(host='localhost', port=6379, db=0)

@celery.task(bind=True)
def process_csv(self, file_path):
    import pandas as pd
    import time
    
    try:
        # 读取CSV文件
        df = pd.read_csv(file_path)
        total_rows = len(df)
        
        # 模拟处理过程
        for i in range(10):
            time.sleep(1)  # 模拟耗时操作
            progress = int((i + 1) * 10)
            # 更新任务状态
            self.update_state(state='PROGRESS', meta={'progress': progress})
            # 存储进度到Redis
            redis_client.set(f'task:{self.request.id}:progress', progress)
        
        # 计算统计信息
        statistics = {
            'total_rows': total_rows,
            'columns': list(df.columns),
            'data_types': df.dtypes.astype(str).to_dict(),
            'numeric_columns': df.select_dtypes(include=['number']).columns.tolist(),
            'summary': df.describe().to_dict()
        }
        
        # 生成统计报告文件
        report_path = tempfile.mktemp(suffix='.json')
        import json
        with open(report_path, 'w') as f:
            json.dump(statistics, f, indent=2)
        
        # 存储最终进度
        redis_client.set(f'task:{self.request.id}:progress', 100)
        
        return {'report_path': report_path, 'statistics': statistics}
    finally:
        # 删除临时CSV文件
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # 保存上传的文件，使用唯一文件名避免覆盖
    temp_dir = tempfile.gettempdir()
    # 生成唯一文件名
    unique_filename = f"{os.urandom(8).hex()}_{file.filename}"
    file_path = os.path.join(temp_dir, unique_filename)
    file.save(file_path)
    
    # 提交任务到Celery
    task = process_csv.delay(file_path)
    
    return jsonify({'task_id': task.id})

@app.route('/status/<task_id>')
def task_status(task_id):
    task = process_csv.AsyncResult(task_id)
    
    # 从Redis获取进度
    progress = redis_client.get(f'task:{task_id}:progress')
    progress = int(progress) if progress else 0
    
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Task is waiting to be executed',
            'progress': 0
        }
    elif task.state == 'PROGRESS':
        response = {
            'state': task.state,
            'progress': progress
        }
    elif task.state == 'SUCCESS':
        response = {
            'state': task.state,
            'progress': 100,
            'result': task.result
        }
    else:
        response = {
            'state': task.state,
            'status': str(task.info),
            'progress': progress
        }
    
    return jsonify(response)

@app.route('/download/<task_id>')
def download_result(task_id):
    task = process_csv.AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        report_path = task.result.get('report_path')
        if report_path and os.path.exists(report_path):
            # 读取文件内容
            with open(report_path, 'rb') as f:
                file_content = f.read()
            
            # 删除临时报告文件
            try:
                os.remove(report_path)
            except:
                pass
            
            # 清理Redis中的进度信息
            try:
                redis_client.delete(f'task:{task_id}:progress')
            except:
                pass
            
            # 返回文件内容
            from flask import make_response
            response = make_response(file_content)
            response.headers['Content-Disposition'] = 'attachment; filename=statistics_report.json'
            response.headers['Content-Type'] = 'application/json'
            return response
        else:
            return jsonify({'error': 'Report file not found'}), 404
    else:
        return jsonify({'error': 'Task not completed yet'}), 400

if __name__ == '__main__':
    app.run(debug=True)