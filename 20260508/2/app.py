from flask import Flask, render_template, request, jsonify
import joblib
import json
import numpy as np

app = Flask(__name__)

model = None
metrics = None

feature_info = {
    'CRIM': {'label': '城镇人均犯罪率', 'unit': '%', 'default': 0.1},
    'ZN': {'label': '超过25000平方英尺的住宅用地比例', 'unit': '%', 'default': 0.0},
    'INDUS': {'label': '城镇非零售商业用地比例', 'unit': '%', 'default': 7.0},
    'CHAS': {'label': '是否靠近查尔斯河 (1=是, 0=否)', 'unit': '', 'default': 0},
    'NOX': {'label': '一氧化氮浓度', 'unit': 'ppm', 'default': 0.5},
    'RM': {'label': '平均房间数', 'unit': '间', 'default': 6.0},
    'AGE': {'label': '1940年前建造的自住房屋比例', 'unit': '%', 'default': 60.0},
    'DIS': {'label': '到波士顿五个就业中心的加权距离', 'unit': '英里', 'default': 4.0},
    'RAD': {'label': '辐射性公路可达性指数', 'unit': '', 'default': 5},
    'TAX': {'label': '每10000美元的全值财产税率', 'unit': '$', 'default': 300.0},
    'PTRATIO': {'label': '城镇师生比例', 'unit': '', 'default': 18.0},
    'B': {'label': '黑人比例指数 (1000(Bk - 0.63)^2)', 'unit': '', 'default': 396.0},
    'LSTAT': {'label': '低收入人口比例', 'unit': '%', 'default': 12.0}
}

def load_model():
    global model, metrics
    model = joblib.load('boston_housing_model.pkl')
    with open('model_metrics.json', 'r') as f:
        metrics = json.load(f)

@app.route('/')
def index():
    return render_template('index.html', feature_info=feature_info)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        features = []
        for feature in metrics['feature_names']:
            value = float(request.form[feature])
            features.append(value)
        
        features_array = np.array(features).reshape(1, -1)
        prediction = model.predict(features_array)[0]
        
        return render_template('result.html', 
                               prediction=round(prediction * 1000, 2),
                               input_data=request.form,
                               feature_info=feature_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/predict', methods=['POST'])
def api_predict():
    try:
        data = request.get_json()
        features = []
        for feature in metrics['feature_names']:
            features.append(float(data[feature]))
        
        features_array = np.array(features).reshape(1, -1)
        prediction = model.predict(features_array)[0]
        
        return jsonify({
            'prediction': round(prediction, 4),
            'prediction_usd': round(prediction * 1000, 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/metrics')
def show_metrics():
    return render_template('metrics.html', metrics=metrics)

if __name__ == '__main__':
    load_model()
    app.run(debug=True, host='0.0.0.0', port=5000)
