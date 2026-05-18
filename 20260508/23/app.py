import os
import uuid
import json
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import pandas as pd
import io

from utils.data_processor import DataProcessor
from utils.arima_model import ARIMAForecaster
from utils.prophet_model import ProphetForecaster

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

file_store = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '未找到文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '未选择文件'}), 400
        
        if file and allowed_file(file.filename):
            file_id = str(uuid.uuid4())
            original_filename = secure_filename(file.filename)
            file_ext = original_filename.rsplit('.', 1)[1].lower()
            saved_filename = f"{file_id}.{file_ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
            file.save(file_path)
            
            try:
                df = DataProcessor.load_csv(file_path)
            except Exception as e:
                os.remove(file_path)
                return jsonify({'success': False, 'error': f'CSV文件解析失败: {str(e)}'}), 400
            
            is_valid, message = DataProcessor.validate_data(df)
            if not is_valid:
                os.remove(file_path)
                return jsonify({'success': False, 'error': message}), 400
            
            processed_df = DataProcessor.preprocess(df)
            preview = DataProcessor.get_preview(processed_df)
            
            file_store[file_id] = {
                'file_path': file_path,
                'original_filename': original_filename,
                'processed_df': processed_df,
                'row_count': len(processed_df)
            }
            
            return jsonify({
                'success': True,
                'file_id': file_id,
                'filename': original_filename,
                'columns': list(processed_df.columns),
                'row_count': len(processed_df),
                'preview': preview
            })
        
        return jsonify({'success': False, 'error': '不支持的文件格式，请上传CSV文件'}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'上传失败: {str(e)}'}), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        file_id = data.get('file_id')
        model_type = data.get('model', 'arima')
        periods = int(data.get('periods', 30))
        arima_params = data.get('arima_params', {})
        
        if not file_id or file_id not in file_store:
            return jsonify({'success': False, 'error': '无效的文件ID，请重新上传文件'}), 400
        
        if periods < 1 or periods > 1000:
            return jsonify({'success': False, 'error': '预测步数必须在1-1000之间'}), 400
        
        stored = file_store[file_id]
        df = stored['processed_df']
        
        if len(df) < 10:
            return jsonify({'success': False, 'error': '数据量太少，至少需要10条数据才能进行预测'}), 400
        
        if model_type == 'arima':
            forecaster = ARIMAForecaster()
            auto_select = arima_params.get('auto', True)
            
            if auto_select:
                train_result = forecaster.train(df)
            else:
                p = int(arima_params.get('p', 1))
                d = int(arima_params.get('d', 1))
                q = int(arima_params.get('q', 1))
                if p < 0 or p > 10 or d < 0 or d > 3 or q < 0 or q > 10:
                    return jsonify({'success': False, 'error': 'ARIMA参数无效，p:0-10, d:0-3, q:0-10'}), 400
                train_result = forecaster.train(df, order=(p, d, q))
            
            if not train_result['success']:
                return jsonify(train_result), 400
            
            predict_result = forecaster.predict(periods)
            if not predict_result['success']:
                return jsonify(predict_result), 400
            
            model_info = {
                'model': 'ARIMA',
                'parameters': train_result['order'],
                'aic': train_result.get('aic')
            }
        
        elif model_type == 'prophet':
            forecaster = ProphetForecaster()
            train_result = forecaster.train(df)
            
            if not train_result['success']:
                return jsonify(train_result), 400
            
            predict_result = forecaster.predict(periods)
            if not predict_result['success']:
                return jsonify(predict_result), 400
            
            model_info = {
                'model': 'Prophet',
                'parameters': train_result['parameters']
            }
        
        else:
            return jsonify({'success': False, 'error': '不支持的模型类型'}), 400
        
        historical_dates = [d.strftime('%Y-%m-%d') for d in df['date']]
        historical_values = [round(float(v), 4) for v in df['value']]
        
        test_size = min(0.2, 10 / len(df))
        train_df, test_df = DataProcessor.split_train_test(df, test_size=test_size)
        
        if len(test_df) > 0:
            if model_type == 'arima':
                eval_forecaster = ARIMAForecaster()
                if auto_select:
                    eval_forecaster.train(train_df)
                else:
                    eval_forecaster.train(train_df, order=(p, d, q))
            else:
                eval_forecaster = ProphetForecaster()
                eval_forecaster.train(train_df)
            
            eval_result = eval_forecaster.evaluate(test_df)
            metrics = eval_result.get('metrics', {})
        else:
            metrics = {'rmse': 0, 'mae': 0, 'mape': 0}
        
        result = {
            'success': True,
            'historical': {
                'dates': historical_dates,
                'values': historical_values
            },
            'forecast': {
                'dates': predict_result['dates'],
                'values': predict_result['values'],
                'lower': predict_result['lower'],
                'upper': predict_result['upper']
            },
            'model_info': model_info,
            'metrics': metrics
        }
        
        file_store[file_id]['last_result'] = result
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'预测失败: {str(e)}'}), 500


@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.get_json()
        file_id = data.get('file_id')
        
        if not file_id or file_id not in file_store:
            return jsonify({'success': False, 'error': '无效的文件ID'}), 400
        
        stored = file_store[file_id]
        if 'last_result' not in stored:
            return jsonify({'success': False, 'error': '请先执行预测'}), 400
        
        result = stored['last_result']
        
        output = io.StringIO()
        output.write('date,value,type\n')
        
        for d, v in zip(result['historical']['dates'], result['historical']['values']):
            output.write(f'{d},{v},historical\n')
        
        for i, d in enumerate(result['forecast']['dates']):
            output.write(f'{d},{result["forecast"]["values"][i]},forecast\n')
        
        output.seek(0)
        
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='forecast_result.csv'
        )
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'下载失败: {str(e)}'}), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': '文件过大，最大支持50MB'}), 413


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
