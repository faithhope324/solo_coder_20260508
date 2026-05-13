import io
import os
import uuid
import threading
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from clustering import Clusterer
from reducer import UMAPReducer

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.secret_key = 'cluster-viz-secret-key-2024'
CORS(app, supports_credentials=True)

user_sessions = {}
session_lock = threading.Lock()


def get_or_create_session():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    session_id = session['session_id']
    with session_lock:
        if session_id not in user_sessions:
            user_sessions[session_id] = {
                'data': None,
                'embedding_2d': None,
                'embedding_3d': None,
                'lock': threading.Lock()
            }
    return user_sessions[session_id]


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')


@app.route('/api/upload', methods=['POST'])
def upload_csv():
    user_session = get_or_create_session()
    with user_session['lock']:
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file part'}), 400
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            if file:
                csv_content = file.read().decode('utf-8')
                df = pd.read_csv(io.StringIO(csv_content))
                numeric_df = df.select_dtypes(include=[np.number])
                if numeric_df.empty:
                    return jsonify({'error': 'No numeric columns found in CSV'}), 400
                X = numeric_df.values
                user_session['data'] = {
                    'X': X.tolist(),
                    'columns': numeric_df.columns.tolist(),
                    'n_samples': X.shape[0],
                    'n_features': X.shape[1],
                    'filename': file.filename
                }
                reducer_2d = UMAPReducer(n_components=2)
                user_session['embedding_2d'] = reducer_2d.fit_transform(X)
                reducer_3d = UMAPReducer(n_components=3)
                user_session['embedding_3d'] = reducer_3d.fit_transform(X)
                return jsonify({
                    'message': 'File uploaded successfully',
                    'data_info': user_session['data'],
                    'embedding_2d': user_session['embedding_2d'],
                    'embedding_3d': user_session['embedding_3d']
                })
        except Exception as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/cluster', methods=['POST'])
def cluster():
    user_session = get_or_create_session()
    with user_session['lock']:
        if user_session['data'] is None or user_session['embedding_2d'] is None:
            return jsonify({'error': 'No data uploaded yet'}), 400
        try:
            data = request.get_json()
            algorithm = data.get('algorithm', 'dbscan').lower()
            eps = float(data.get('eps', 0.5))
            min_samples = int(data.get('min_samples', 5))
            X_2d = np.array(user_session['embedding_2d']['embedding'])
            clusterer = Clusterer(algorithm=algorithm, eps=eps, min_samples=min_samples)
            cluster_result = clusterer.fit_predict(X_2d)
            return jsonify({
                'cluster_result': cluster_result,
                'embedding_2d': user_session['embedding_2d'],
                'embedding_3d': user_session['embedding_3d']
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/status', methods=['GET'])
def status():
    user_session = get_or_create_session()
    with user_session['lock']:
        if user_session['data'] is not None:
            return jsonify({
                'has_data': True,
                'data_info': user_session['data']
            })
    return jsonify({'has_data': False})


@app.route('/api/clear', methods=['POST'])
def clear_session():
    user_session = get_or_create_session()
    with user_session['lock']:
        user_session['data'] = None
        user_session['embedding_2d'] = None
        user_session['embedding_3d'] = None
    return jsonify({'message': 'Session cleared'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
