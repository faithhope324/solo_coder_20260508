from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from .simulation import (
    SimulationManager,
    get_default_config,
    get_default_receiver_array_config
)

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

sim_manager = SimulationManager()


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')


@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        'default': get_default_config(),
        'default_receiver_array': get_default_receiver_array_config()
    })


@app.route('/api/configure', methods=['POST'])
def configure_simulation():
    try:
        config = request.json
        result = sim_manager.configure(config)
        return jsonify({
            'success': True,
            'message': 'Simulation configured successfully',
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400


@app.route('/api/receivers/array', methods=['POST'])
def create_receiver_array():
    try:
        array_config = request.json
        receivers = sim_manager.create_receiver_array(array_config)
        return jsonify({
            'success': True,
            'receivers': receivers
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400


@app.route('/api/step', methods=['POST'])
def run_step():
    try:
        data = request.json or {}
        num_steps = data.get('num_steps', 10)
        result = sim_manager.run_step(num_steps)
        return jsonify({
            'success': True,
            **result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400


@app.route('/api/run', methods=['POST'])
def run_full():
    try:
        data = request.json or {}
        nsteps = data.get('nsteps', 1000)
        frame_interval = data.get('frame_interval', 10)
        result = sim_manager.run_full(nsteps, frame_interval)
        return jsonify({
            'success': True,
            **result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400


@app.route('/api/frame/<int:frame_idx>', methods=['GET'])
def get_frame(frame_idx):
    frame = sim_manager.get_frame(frame_idx)
    if frame is None:
        return jsonify({
            'success': False,
            'message': 'Frame not found'
        }), 404
    return jsonify({
        'success': True,
        'frame': frame
    })


@app.route('/api/frames', methods=['GET'])
def get_all_frames():
    return jsonify({
        'success': True,
        'frames': sim_manager.get_all_frames()
    })


@app.route('/api/receivers/data', methods=['GET'])
def get_receiver_data():
    return jsonify({
        'success': True,
        'receiver_data': sim_manager.get_current_receiver_data(),
        'dt': sim_manager.dt
    })


@app.route('/api/reset', methods=['POST'])
def reset_simulation():
    sim_manager.reset()
    return jsonify({
        'success': True,
        'message': 'Simulation reset successfully'
    })


@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'configured': sim_manager.solver is not None,
        'current_step': sim_manager.solver.current_step if sim_manager.solver else 0,
        'dt': sim_manager.dt,
        'num_frames': len(sim_manager.frames),
        'config': sim_manager.config
    })


def create_app():
    return app


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
