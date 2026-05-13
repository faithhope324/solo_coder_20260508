from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_action', methods=['POST'])
def get_action():
    data = request.json
    # 简单的随机策略
    action = np.random.randint(0, 2)
    return jsonify({'action': int(action)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
