import os
import sys
from datetime import datetime, timedelta
import uuid

from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from src.data_loader import DataLoader
from src.model_trainer import SalesForecaster, ModelNotInstalledError
from src.visualizer import Visualizer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sales-forecast-secret-key-2024'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'csv'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('data', exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    sample_file = 'data/sample_sales_data.csv'
    has_sample = os.path.exists(sample_file)
    
    column_info = session.get('column_info', None)
    data_preview = session.get('data_preview', None)
    has_data = column_info is not None
    
    available_models = SalesForecaster.get_available_models()
    model_install_info = SalesForecaster.get_model_install_info()
    
    return render_template('index.html', 
                         has_sample=has_sample,
                         has_data=has_data,
                         column_info=column_info,
                         data_preview=data_preview,
                         available_models=available_models,
                         model_install_info=model_install_info)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('请选择要上传的文件', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    if file.filename == '':
        flash('未选择文件', 'error')
        return redirect(url_for('index'))
    
    if file and allowed_file(file.filename):
        try:
            loader = DataLoader()
            loader.load_from_upload(file)
            
            valid, errors = loader.validate()
            if errors:
                for err in errors:
                    flash(err, 'warning' if valid else 'error')
                if not valid:
                    return redirect(url_for('index'))
            
            column_info = loader.get_column_info()
            preview_df = loader.df.head(10).reset_index()
            
            date_col = column_info.get('date_column', 'date')
            sales_col = column_info.get('sales_column', 'sales')
            
            preview_data = []
            for _, row in preview_df.iterrows():
                row_data = {}
                row_data[date_col] = row.get(date_col, row.get('date', ''))
                if hasattr(row_data[date_col], 'strftime'):
                    row_data[date_col] = row_data[date_col].strftime('%Y-%m-%d')
                row_data[sales_col] = round(row.get(sales_col, 0), 2)
                
                promo_col = column_info.get('promo_column')
                if promo_col and promo_col in row:
                    row_data[promo_col] = '是' if row.get(promo_col, 0) == 1 else '否'
                
                preview_data.append(row_data)
            
            session['column_info'] = column_info
            session['data_preview'] = preview_data
            
            file.seek(0)
            session_id = str(uuid.uuid4())
            session['file_id'] = session_id
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}.csv')
            file.save(filepath)
            
            flash(f'数据加载成功！共 {column_info["total_rows"]} 条记录', 'success')
            
        except Exception as e:
            flash(f'文件处理失败: {str(e)}', 'error')
            return redirect(url_for('index'))
    else:
        flash('只允许上传 CSV 文件', 'error')
    
    return redirect(url_for('index'))


@app.route('/load_sample')
def load_sample():
    sample_file = 'data/sample_sales_data.csv'
    if not os.path.exists(sample_file):
        flash('示例数据文件不存在', 'error')
        return redirect(url_for('index'))
    
    try:
        loader = DataLoader()
        loader.load_csv(sample_file)
        
        valid, errors = loader.validate()
        if errors:
            for err in errors:
                flash(err, 'warning' if valid else 'error')
        
        column_info = loader.get_column_info()
        preview_df = loader.df.head(10).reset_index()
        
        date_col = column_info.get('date_column', 'date')
        sales_col = column_info.get('sales_column', 'sales')
        
        preview_data = []
        for _, row in preview_df.iterrows():
            row_data = {}
            row_data[date_col] = row.get(date_col, row.get('date', ''))
            if hasattr(row_data[date_col], 'strftime'):
                row_data[date_col] = row_data[date_col].strftime('%Y-%m-%d')
            row_data[sales_col] = round(row.get(sales_col, 0), 2)
            
            promo_col = column_info.get('promo_column')
            if promo_col and promo_col in row:
                row_data[promo_col] = '是' if row.get(promo_col, 0) == 1 else '否'
            
            preview_data.append(row_data)
        
        session['column_info'] = column_info
        session['data_preview'] = preview_data
        session['file_id'] = 'sample'
        
        flash(f'示例数据加载成功！共 {column_info["total_rows"]} 条记录', 'success')
        
    except Exception as e:
        flash(f'加载示例数据失败: {str(e)}', 'error')
    
    return redirect(url_for('index'))


@app.route('/forecast', methods=['POST'])
def forecast():
    file_id = session.get('file_id')
    if not file_id:
        flash('请先上传或加载数据', 'error')
        return redirect(url_for('index'))
    
    if file_id == 'sample':
        filepath = 'data/sample_sales_data.csv'
    else:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{file_id}.csv')
    
    if not os.path.exists(filepath):
        flash('数据文件不存在，请重新上传', 'error')
        return redirect(url_for('index'))
    
    model_type = request.form.get('model_type', 'auto')
    forecast_days = int(request.form.get('forecast_days', 7))
    auto_tune = request.form.get('auto_tune', 'on') == 'on'
    
    promo_dates_str = request.form.get('promo_dates', '')
    promo_dates = [d.strip() for d in promo_dates_str.split(',') if d.strip()] if promo_dates_str else None
    
    try:
        loader = DataLoader()
        loader.load_csv(filepath)
        
        forecaster = SalesForecaster(loader)
        model_info = forecaster.fit(model_type=model_type, auto_tune=auto_tune)
        
        predictions = forecaster.predict(periods=forecast_days, promo_dates=promo_dates)
        summary = forecaster.get_prediction_summary(predictions)
        
        visualizer = Visualizer()
        historical_plot = visualizer.plot_historical_trend(
            loader.get_time_series(),
            loader.get_promo_series()
        )
        forecast_plot = visualizer.plot_forecast(
            loader.get_time_series(),
            predictions,
            loader.get_promo_series()
        )
        comparison_plot = visualizer.plot_comparison(
            loader.get_time_series(),
            predictions
        )
        prediction_table = visualizer.generate_prediction_table(predictions)
        summary_cards = visualizer.generate_summary_cards(summary)
        
        predictions_data = []
        for idx, row in predictions.iterrows():
            predictions_data.append({
                'date': idx.strftime('%Y-%m-%d'),
                'predicted': round(row['predicted'], 2),
                'lower': round(row['lower'], 2),
                'upper': round(row['upper'], 2)
            })
        
        session['predictions'] = predictions_data
        session['summary'] = summary
        
        return render_template('forecast.html',
                             model_info=model_info,
                             summary=summary,
                             summary_cards=summary_cards,
                             historical_plot=historical_plot,
                             forecast_plot=forecast_plot,
                             comparison_plot=comparison_plot,
                             prediction_table=prediction_table,
                             predictions=predictions_data)
        
    except ModelNotInstalledError as e:
        error_msg = f'{str(e)}。当前可用模型: {", ".join(SalesForecaster.get_available_models()) or "无"}。请安装后重试。'
        flash(error_msg, 'error')
        return redirect(url_for('index'))
        
    except Exception as e:
        flash(f'预测失败: {str(e)}', 'error')
        return redirect(url_for('index'))


@app.route('/results')
def results():
    predictions = session.get('predictions')
    summary = session.get('summary')
    
    if not predictions or not summary:
        flash('请先进行预测', 'error')
        return redirect(url_for('index'))
    
    return render_template('results.html',
                         predictions=predictions,
                         summary=summary)


@app.route('/download_template')
def download_template():
    return send_from_directory('data', 'sample_sales_data.csv', as_attachment=True)


@app.route('/reset')
def reset():
    for key in ['column_info', 'data_preview', 'file_id', 'predictions', 'summary']:
        session.pop(key, None)
    
    flash('已重置所有数据', 'info')
    return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
