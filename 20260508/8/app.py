from flask import Flask, render_template, request, jsonify
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.optimizers import Adam
import traceback

app = Flask(__name__)

# 加载训练好的模型
state_size = 4
action_size = 2

print("Initializing model...")
try:
    model = Sequential()
    model.add(Dense(24, input_dim=state_size, activation='relu'))
    model.add(Dense(24, activation='relu'))
    model.add(Dense(action_size, activation='linear'))
    model.compile(loss='mse', optimizer=Adam(lr=0.001))
    print("Model created successfully")
except Exception as e:
    print(f"Error creating model: {e}")
    traceback.print_exc()

# 尝试加载模型权重
try:
    model.load_weights('cartpole-dqn.h5')
    print("Model loaded successfully")
except Exception as e:
    print(f"Model not found, using random policy: {e}")

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Error rendering template: {e}")
        traceback.print_exc()
        return "Error loading page"

@app.route('/get_action', methods=['POST'])
def get_action():
    try:
        data = request.json
        state = np.array(data['state']).reshape(1, state_size)
        try:
            action = np.argmax(model.predict(state)[0])
        except Exception as e:
            # Use random policy as fallback
            print(f"Error predicting action: {e}")
            action = np.random.randint(0, action_size)
        return jsonify({'action': int(action)})
    except Exception as e:
        print(f"Error in get_action: {e}")
        traceback.print_exc()
        return jsonify({'action': np.random.randint(0, action_size)})

if __name__ == '__main__':
    print("Starting Flask server...")
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"Error starting server: {e}")
        traceback.print_exc()
