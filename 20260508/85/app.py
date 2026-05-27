import os
import sys
from flask import Flask, render_template, request, jsonify

sys.path.insert(0, os.path.dirname(__file__))

from src.data_loader import load_data, clean_data, filter_by_date, get_date_range
from src.stat_analysis import (
    calculate_correlation, 
    generate_heatmap_data, 
    calculate_overview_stats,
    calculate_correlation_insights
)
from src.wordcloud_gen import get_wordcloud_analysis

app = Flask(__name__)

CLEANED_DATA = None

def init_data():
    global CLEANED_DATA
    try:
        raw_data = load_data()
        CLEANED_DATA = clean_data(raw_data)
        print("数据初始化成功")
        return True
    except Exception as e:
        print(f"数据初始化失败: {str(e)}")
        return False

def get_filtered_data(start_date=None, end_date=None):
    global CLEANED_DATA
    if CLEANED_DATA is None:
        if not init_data():
            return None
    return filter_by_date(CLEANED_DATA, start_date, end_date)

@app.route('/')
def dashboard():
    global CLEANED_DATA
    if CLEANED_DATA is None:
        init_data()
    
    min_date, max_date = get_date_range(CLEANED_DATA) if CLEANED_DATA is not None else (None, None)
    
    return render_template('dashboard.html', 
                         min_date=min_date, 
                         max_date=max_date)

@app.route('/api/overview')
def api_overview():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    
    df = get_filtered_data(start_date, end_date)
    
    if df is None or len(df) == 0:
        return jsonify({
            'code': 404,
            'message': '没有找到符合条件的数据',
            'data': None
        })
    
    stats = calculate_overview_stats(df)
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': stats
    })

@app.route('/api/heatmap')
def api_heatmap():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    
    df = get_filtered_data(start_date, end_date)
    
    if df is None or len(df) == 0:
        return jsonify({
            'code': 404,
            'message': '没有找到符合条件的数据',
            'data': None
        })
    
    corr_matrix, p_matrix = calculate_correlation(df)
    heatmap_data = generate_heatmap_data(corr_matrix)
    insights = calculate_correlation_insights(corr_matrix)
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            **heatmap_data,
            'insights': insights
        }
    })

@app.route('/api/wordcloud')
def api_wordcloud():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    
    df = get_filtered_data(start_date, end_date)
    
    if df is None or len(df) == 0:
        return jsonify({
            'code': 404,
            'message': '没有找到符合条件的数据',
            'data': None
        })
    
    text_series = df['comment']
    wordcloud_data = get_wordcloud_analysis(text_series, top_n=100)
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': wordcloud_data
    })

@app.route('/api/data')
def api_data():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    page = int(request.args.get('page', 1))
    size = int(request.args.get('size', 20))
    
    df = get_filtered_data(start_date, end_date)
    
    if df is None or len(df) == 0:
        return jsonify({
            'code': 404,
            'message': '没有找到符合条件的数据',
            'data': None,
            'total': 0,
            'page': page,
            'size': size
        })
    
    total = len(df)
    start_idx = (page - 1) * size
    end_idx = start_idx + size
    
    df_page = df.iloc[start_idx:end_idx].copy()
    df_page['review_date'] = df_page['review_date'].dt.strftime('%Y-%m-%d')
    
    data_list = df_page.to_dict('records')
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': data_list,
        'total': total,
        'page': page,
        'size': size
    })

@app.route('/api/date-range')
def api_date_range():
    global CLEANED_DATA
    if CLEANED_DATA is None:
        init_data()
    
    min_date, max_date = get_date_range(CLEANED_DATA) if CLEANED_DATA is not None else (None, None)
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'min_date': min_date,
            'max_date': max_date
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'code': 404,
        'message': '接口不存在'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'code': 500,
        'message': f'服务器内部错误: {str(error)}'
    }), 500

if __name__ == '__main__':
    init_data()
    app.run(debug=False, host='0.0.0.0', port=5000)
