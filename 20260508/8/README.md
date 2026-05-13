# CartPole Control with Reinforcement Learning

This project implements a CartPole balancing control system using reinforcement learning (DQN algorithm) and provides a web interface for manual and automatic control.

## Project Structure

```
.
├── app.py              # Flask backend application
├── train.py            # DQN training script for CartPole-v1
├── simple_app.py       # Simplified Flask app (without TensorFlow)
├── test_flask.py       # Basic Flask test script
├── templates/
│   └── index.html      # Web frontend with Canvas animation
└── README.md           # This file
```

## Requirements

- Python 3.6+
- Flask
- OpenAI Gym
- TensorFlow 2.x
- NumPy

## Installation

```bash
pip install flask gym tensorflow numpy
```

## Usage

### 1. Train the DQN model

```bash
python train.py
```

This will train the DQN agent on the CartPole-v1 environment and save the model weights to `cartpole-dqn.h5`.

### 2. Run the web application

```bash
python app.py
```

Or use the simplified version (without TensorFlow):

```bash
python simple_app.py
```

### 3. Access the web interface

Open your browser and navigate to `http://localhost:5000`.

## Features

- **Manual Control**: Use left/right arrow keys to control the cart
- **Auto Control**: Let the trained DQN agent control the cart automatically
- **Real-time Animation**: Canvas-based animation of the CartPole system
- **Score Tracking**: Displays the current score (number of steps balanced)

## How it Works

1. **Training**: The `train.py` script uses the DQN algorithm to train an agent on the CartPole-v1 environment.
2. **Backend**: The Flask app loads the trained model and provides an API endpoint for action prediction.
3. **Frontend**: The web interface simulates the CartPole physics and renders the animation using Canvas. It can either send state to the backend for auto control or accept manual input via keyboard.

## Physics Simulation

The frontend implements a simplified version of the CartPole physics using the same equations as OpenAI Gym's CartPole-v1 environment.

## Note

If the trained model is not found, the application will fall back to a random policy for demonstration purposes.
