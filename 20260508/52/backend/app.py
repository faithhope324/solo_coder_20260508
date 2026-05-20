import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from phase_space import simulate_collision
from particle_data import get_particle_color

app = Flask(__name__)
CORS(app)


@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json
        
        collision_type = data.get('collision_type', 'e+e-')
        sqrt_s = float(data.get('sqrt_s', 100))
        process = data.get('process', 'generic')
        
        all_particles, stable_particles = simulate_collision(collision_type, sqrt_s, process)
        
        result = {
            'event': {
                'collision_type': collision_type,
                'sqrt_s': sqrt_s,
                'process': process,
                'n_all': len(all_particles),
                'n_stable': len(stable_particles),
            },
            'all_particles': [p.to_dict() for p in all_particles],
            'stable_particles': [p.to_dict() for p in stable_particles],
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/particle-types', methods=['GET'])
def get_particle_types():
    types = [
        {'id': 'e+e-', 'name': '电子-正电子 (e⁺e⁻)'},
        {'id': 'pp', 'name': '质子-质子 (pp)'},
    ]
    return jsonify(types)


@app.route('/api/processes', methods=['GET'])
def get_processes():
    processes = [
        {'id': 'generic', 'name': '通用过程'},
        {'id': 'higgs', 'name': 'Higgs 玻色子产生'},
        {'id': 'z', 'name': 'Z 玻色子产生'},
    ]
    return jsonify(processes)


@app.route('/api/energy-ranges', methods=['GET'])
def get_energy_ranges():
    ranges = {
        'e+e-': {'min': 10, 'max': 1000, 'default': 91, 'unit': 'GeV'},
        'pp': {'min': 10, 'max': 14000, 'default': 13000, 'unit': 'GeV'},
    }
    return jsonify(ranges)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
