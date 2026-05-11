import os
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

ALLOWED_EXTENSIONS = {'csv'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CHINA_PROVINCES = {
    '北京': {'lat': 39.9042, 'lon': 116.4074},
    '上海': {'lat': 31.2304, 'lon': 121.4737},
    '广东': {'lat': 23.1291, 'lon': 113.2644},
    '江苏': {'lat': 32.0603, 'lon': 118.7969},
    '浙江': {'lat': 30.2741, 'lon': 120.1551},
    '山东': {'lat': 36.6766, 'lon': 117.0009},
    '河南': {'lat': 34.7466, 'lon': 113.6254},
    '四川': {'lat': 30.5728, 'lon': 104.0668},
    '湖北': {'lat': 30.5928, 'lon': 114.3055},
    '湖南': {'lat': 28.2282, 'lon': 112.9388},
    '河北': {'lat': 38.0428, 'lon': 114.5149},
    '福建': {'lat': 26.0745, 'lon': 119.2965},
    '安徽': {'lat': 31.8206, 'lon': 117.2272},
    '辽宁': {'lat': 41.8057, 'lon': 123.4315},
    '陕西': {'lat': 34.3416, 'lon': 108.9398},
    '江西': {'lat': 28.6820, 'lon': 115.8579},
    '重庆': {'lat': 29.4316, 'lon': 106.9123},
    '天津': {'lat': 39.0842, 'lon': 117.2009},
    '云南': {'lat': 25.0389, 'lon': 102.7183},
    '广西': {'lat': 22.8155, 'lon': 108.3275},
    '山西': {'lat': 37.8706, 'lon': 112.5489},
    '贵州': {'lat': 26.6470, 'lon': 106.6302},
    '黑龙江': {'lat': 45.8038, 'lon': 126.5350},
    '吉林': {'lat': 43.8171, 'lon': 125.3235},
    '甘肃': {'lat': 36.0611, 'lon': 103.8343},
    '内蒙古': {'lat': 40.8414, 'lon': 111.7519},
    '新疆': {'lat': 43.8256, 'lon': 87.6168},
    '海南': {'lat': 20.0440, 'lon': 110.1999},
    '宁夏': {'lat': 38.4872, 'lon': 106.2309},
    '青海': {'lat': 36.6171, 'lon': 101.7782},
    '西藏': {'lat': 29.6520, 'lon': 91.1721},
    '香港': {'lat': 22.3193, 'lon': 114.1694},
    '澳门': {'lat': 22.1987, 'lon': 113.5439},
    '台湾': {'lat': 25.0330, 'lon': 121.5654}
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_data(filepath):
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip()
    
    required_columns = ['订单日期', '产品类别', '销售额', '数量', '地区']
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f'CSV文件缺少必要列: {col}')
    
    df['订单日期'] = pd.to_datetime(df['订单日期'])
    df['销售额'] = pd.to_numeric(df['销售额'], errors='coerce')
    df['数量'] = pd.to_numeric(df['数量'], errors='coerce')
    df = df.dropna(subset=['销售额', '数量'])
    
    return df

def get_monthly_trend(df):
    df['月份'] = df['订单日期'].dt.to_period('M').astype(str)
    monthly_data = df.groupby('月份')['销售额'].sum().reset_index()
    monthly_data = monthly_data.sort_values('月份')
    
    fig = px.line(
        monthly_data,
        x='月份',
        y='销售额',
        title='月度销售额趋势',
        markers=True,
        line_shape='spline'
    )
    
    fig.update_layout(
        xaxis_title='月份',
        yaxis_title='销售额 (元)',
        hovermode='x unified',
        template='plotly_white'
    )
    
    fig.update_traces(
        line=dict(width=3),
        marker=dict(size=8)
    )
    
    return fig.to_json()

def get_category_pie(df):
    category_data = df.groupby('产品类别')['销售额'].sum().reset_index()
    category_data = category_data.sort_values('销售额', ascending=False)
    
    fig = go.Figure(data=[go.Pie(
        labels=category_data['产品类别'],
        values=category_data['销售额'],
        hole=0.5,
        textposition='auto',
        textinfo='percent',
        textfont=dict(size=11),
        hovertemplate='<b>%{label}</b><br>销售额: ¥%{value:,.2f}<br>占比: %{percent}',
        marker=dict(line=dict(color='white', width=2))
    )])
    
    fig.update_layout(
        title='各类别销售额占比',
        template='plotly_white',
        legend=dict(
            orientation='v',
            yanchor='middle',
            y=0.5,
            xanchor='right',
            x=0.95,
            font=dict(size=10),
            itemsizing='constant',
            itemwidth=30
        ),
        margin=dict(t=50, b=20, l=20, r=100),
        autosize=True,
        width=None,
        height=None
    )
    
    return fig.to_json()

def get_region_heatmap(df):
    region_data = df.groupby('地区')['销售额'].sum().reset_index()
    
    latitudes = []
    longitudes = []
    for region in region_data['地区']:
        if region in CHINA_PROVINCES:
            latitudes.append(CHINA_PROVINCES[region]['lat'])
            longitudes.append(CHINA_PROVINCES[region]['lon'])
        else:
            latitudes.append(None)
            longitudes.append(None)
    
    region_data['lat'] = latitudes
    region_data['lon'] = longitudes
    region_data = region_data.dropna(subset=['lat', 'lon'])
    
    if len(region_data) == 0:
        return {'empty': True, 'message': '无法识别地区数据，请检查地区名称是否为中国省份'}
    
    fig = go.Figure()
    
    fig.add_trace(go.Scattergeo(
        lat=region_data['lat'],
        lon=region_data['lon'],
        mode='markers',
        marker=dict(
            size=region_data['销售额'].apply(lambda x: max(15, min(40, x / region_data['销售额'].max() * 25 + 15))),
            color=region_data['销售额'],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(
                title='销售额',
                tickformat=',.0f',
                len=0.7,
                x=0.9
            ),
            opacity=0.85,
            line=dict(width=2, color='white')
        ),
        text=region_data.apply(lambda row: f'<b>{row["地区"]}</b><br>销售额: ¥{row["销售额"]:,.2f}', axis=1),
        hoverinfo='text'
    ))
    
    fig.update_layout(
        title='各地区销售额热力图',
        geo=dict(
            scope='asia',
            projection=dict(type='mercator', scale=4),
            center=dict(lat=35.8617, lon=104.1954),
            showland=True,
            landcolor='rgb(243, 243, 243)',
            showcountries=True,
            countrycolor='rgb(200, 200, 200)',
            showsubunits=True,
            subunitcolor='rgb(180, 180, 180)',
            showlakes=True,
            lakecolor='rgb(180, 200, 255)',
            showcoastlines=True,
            coastlinecolor='rgb(100, 100, 100)',
            resolution=50
        ),
        template='plotly_white',
        margin=dict(l=10, r=80, t=50, b=10),
        autosize=True
    )
    
    return {'empty': False, 'data': fig.to_json()}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有选择文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            df = load_data(filepath)
            
            session['filepath'] = filepath
            session['min_date'] = df['订单日期'].min().strftime('%Y-%m-%d')
            session['max_date'] = df['订单日期'].max().strftime('%Y-%m-%d')
            
            return jsonify({
                'success': True,
                'message': '文件上传成功',
                'min_date': session['min_date'],
                'max_date': session['max_date'],
                'total_records': len(df),
                'categories': df['产品类别'].unique().tolist(),
                'regions': df['地区'].unique().tolist()
            })
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 400
    
    return jsonify({'success': False, 'message': '请上传CSV文件'}), 400

@app.route('/charts', methods=['GET'])
def get_charts():
    if 'filepath' not in session:
        return jsonify({'success': False, 'message': '请先上传数据文件'}), 400
    
    try:
        df = load_data(session['filepath'])
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date and end_date:
            df = df[(df['订单日期'] >= start_date) & (df['订单日期'] <= end_date)]
        
        if len(df) == 0:
            return jsonify({'success': False, 'message': '所选日期范围内没有数据'}), 400
        
        trend_chart = get_monthly_trend(df)
        pie_chart = get_category_pie(df)
        heatmap_data = get_region_heatmap(df)
        
        return jsonify({
            'success': True,
            'trend': json.loads(trend_chart),
            'pie': json.loads(pie_chart),
            'heatmap': heatmap_data,
            'summary': {
                'total_sales': float(df['销售额'].sum()),
                'total_orders': int(df['数量'].sum()),
                'avg_sales': float(df['销售额'].mean()),
                'top_category': df.groupby('产品类别')['销售额'].sum().idxmax(),
                'top_region': df.groupby('地区')['销售额'].sum().idxmax()
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
