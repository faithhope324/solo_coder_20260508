import os
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta

from .data_generator import generate_historical_data, prepare_training_data
from .lstm_model import TrafficPredictor
from .simulation_engine import evaluate_signal_timing, TrafficSimulationEngine

app = Flask(__name__)
CORS(app)

predictor = None
historical_data = None
data_stats = None
is_trained = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'traffic_model.pth')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_trained': is_trained,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/init', methods=['POST'])
def initialize_system():
    global predictor, historical_data, data_stats, is_trained
    
    try:
        historical_data = generate_historical_data(days=30)
        data_stats = prepare_training_data(historical_data, seq_length=72, pred_length=6)
        
        predictor = TrafficPredictor(seq_length=72, pred_length=6)
        predictor.train(
            data_stats['X_train'],
            data_stats['y_train'],
            data_stats['X_test'],
            data_stats['y_test'],
            epochs=30,
            batch_size=32,
            lr=0.001
        )
        
        predictor.save(MODEL_PATH)
        is_trained = True
        
        return jsonify({
            'success': True,
            'message': '系统初始化完成，LSTM模型已训练',
            'data_points': len(historical_data),
            'training_samples': len(data_stats['X_train']),
            'test_samples': len(data_stats['X_test'])
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'初始化失败: {str(e)}'
        }), 500

@app.route('/api/predict', methods=['GET'])
def get_prediction():
    global predictor, historical_data, data_stats
    
    if not is_trained or predictor is None:
        return jsonify({
            'success': False,
            'message': '模型未初始化，请先调用 /api/init'
        }), 400
    
    try:
        flows = historical_data['flow'].values
        recent_data = flows[-72:]
        
        prediction = predictor.predict(
            recent_data,
            data_stats['mean'],
            data_stats['std'],
            n_samples=100
        )
        
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        timestamps = []
        for i in range(6):
            timestamps.append((now + timedelta(minutes=(i+1)*5)).isoformat())
        
        historical_timestamps = []
        historical_flows = flows[-24:].tolist()
        for i in range(24):
            historical_timestamps.append((now - timedelta(minutes=(24-i)*5)).isoformat())
        
        return jsonify({
            'success': True,
            'prediction': {
                'timestamps': timestamps,
                'mean': prediction['mean'],
                'lower': prediction['lower'],
                'upper': prediction['upper']
            },
            'historical': {
                'timestamps': historical_timestamps,
                'flows': historical_flows
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'预测失败: {str(e)}'
        }), 500

@app.route('/api/signal-phases', methods=['GET'])
def get_signal_phases():
    engine = TrafficSimulationEngine()
    phases = []
    for phase in engine.config.phases:
        phases.append({
            'name': phase.name,
            'green_time': phase.green_time,
            'yellow_time': phase.yellow_time,
            'red_time': phase.red_time
        })
    
    return jsonify({
        'success': True,
        'cycle_length': engine.config.cycle_length,
        'phases': phases
    })

@app.route('/api/evaluate', methods=['POST'])
def evaluate_signal_plan():
    global predictor, historical_data, data_stats
    
    if not is_trained or predictor is None:
        return jsonify({
            'success': False,
            'message': '模型未初始化，请先调用 /api/init'
        }), 400
    
    try:
        data = request.get_json()
        
        baseline_times = data.get('baseline', {})
        optimized_times = data.get('optimized', {})
        
        flows = historical_data['flow'].values
        recent_data = flows[-72:]
        prediction = predictor.predict(
            recent_data,
            data_stats['mean'],
            data_stats['std'],
            n_samples=50
        )
        
        predicted_flows = prediction['mean']
        extended_flows = predicted_flows * 10
        
        results = evaluate_signal_timing(
            baseline_times,
            optimized_times,
            extended_flows,
        )
        
        return jsonify({
            'success': True,
            'predicted_flows': predicted_flows,
            'baseline': results['baseline'],
            'optimized': results['optimized'],
            'improvements': results['improvements']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'评估失败: {str(e)}'
        }), 500

@app.route('/api/historical-data', methods=['GET'])
def get_historical_data():
    global historical_data
    
    if historical_data is None:
        return jsonify({
            'success': False,
            'message': '数据未初始化'
        }), 400
    
    try:
        days = int(request.args.get('days', 7))
        recent_data = historical_data.tail(days * 288)
        
        return jsonify({
            'success': True,
            'timestamps': recent_data['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
            'flows': recent_data['flow'].tolist()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取历史数据失败: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
