from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
from sensor_simulator import SensorSimulator
import threading
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

sensor_simulator = SensorSimulator()

def broadcast_current_values():
    while True:
        all_values = sensor_simulator.get_all_current_values()
        socketio.emit('sensor_update', all_values)
        time.sleep(0.5)

def broadcast_chart_data():
    while True:
        all_sensors_data = {}
        for sensor_id in sensor_simulator.sensors.keys():
            all_sensors_data[sensor_id] = sensor_simulator.get_sensor_data(sensor_id)
        socketio.emit('chart_update', all_sensors_data)
        time.sleep(60)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/sensors')
def get_sensors():
    return jsonify(sensor_simulator.get_sensor_list())

@app.route('/api/sensors/<sensor_id>')
def get_sensor_data(sensor_id):
    data = sensor_simulator.get_sensor_data(sensor_id)
    if data:
        return jsonify(data)
    return jsonify({'error': 'Sensor not found'}), 404

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('sensor_list', sensor_simulator.get_sensor_list())
    emit('all_sensor_values', sensor_simulator.get_all_current_values())
    
    all_sensors_data = {}
    for sensor_id in sensor_simulator.sensors.keys():
        all_sensors_data[sensor_id] = sensor_simulator.get_sensor_data(sensor_id)
    emit('chart_update', all_sensors_data)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('get_sensor_data')
def handle_get_sensor_data(sensor_id):
    data = sensor_simulator.get_sensor_data(sensor_id)
    if data:
        emit('sensor_data', data)

if __name__ == '__main__':
    sensor_simulator.start()
    
    current_values_thread = threading.Thread(target=broadcast_current_values, daemon=True)
    current_values_thread.start()
    
    chart_thread = threading.Thread(target=broadcast_chart_data, daemon=True)
    chart_thread.start()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
