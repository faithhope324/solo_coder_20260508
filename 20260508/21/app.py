import threading
import time
from flask import Flask, render_template
from flask_socketio import SocketIO
from solver import HeatEquationSolver2D

app = Flask(__name__)
app.config['SECRET_KEY'] = 'heat-equation-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

solver = None
simulation_thread = None
simulation_running = False
current_frame = 0
last_config = None
initial_state = None


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('initialize')
def handle_initialize(data):
    global solver, current_frame, simulation_running
    simulation_running = False
    current_frame = 0

    nx = int(data.get('nx', 50))
    ny = int(data.get('ny', 50))
    alpha = float(data.get('alpha', 0.01))
    dx = float(data.get('dx', 1.0))
    dy = float(data.get('dy', 1.0))
    dt = float(data.get('dt', 0.1))

    try:
        solver = HeatEquationSolver2D(nx=nx, ny=ny, alpha=alpha, dx=dx, dy=dy, dt=dt)

        pattern = data.get('pattern', 'center_square')
        center_temp = float(data.get('center_temp', 100.0))
        background_temp = float(data.get('background_temp', 0.0))
        square_size = float(data.get('square_size', 0.2))
        solver.set_initial_condition(
            pattern=pattern,
            center_temp=center_temp,
            background_temp=background_temp,
            square_size=square_size
        )

        bc_mapping = {'left': 'left', 'right': 'right', 'top': 'top', 'bottom': 'bottom'}
        for side_key, side_name in bc_mapping.items():
            bc_type = data.get(f'bc_{side_key}_type', 'fixed')
            bc_value = float(data.get(f'bc_{side_key}_value', 0.0))
            solver.set_boundary_condition(side_name, bc_type, bc_value)

        global last_config, initial_state
        last_config = data
        initial_state = solver.get_state()

        socketio.emit('initialized', {
            'state': initial_state,
            'frame': 0,
            'time': 0.0
        })
    except Exception as e:
        socketio.emit('error', {'message': str(e)})


@socketio.on('start_simulation')
def handle_start_simulation(data):
    global simulation_running, simulation_thread, current_frame
    if solver is None:
        socketio.emit('error', {'message': '请先初始化求解器'})
        return

    if simulation_running:
        return

    simulation_running = True
    steps_per_frame = int(data.get('steps_per_frame', 5))
    frame_delay = float(data.get('frame_delay', 0.05))

    socketio.emit('simulation_started', {
        'frame': current_frame,
        'time': round(current_frame * solver.dt, 4)
    })

    def run_simulation():
        global current_frame, simulation_running
        sleep_interval = 0.01
        while simulation_running:
            try:
                solver.step(steps_per_frame)
                current_frame += steps_per_frame
                current_time = current_frame * solver.dt
                socketio.emit('update', {
                    'state': solver.get_state(),
                    'frame': current_frame,
                    'time': round(current_time, 4)
                })
                slept = 0.0
                while simulation_running and slept < frame_delay:
                    time.sleep(min(sleep_interval, frame_delay - slept))
                    slept += sleep_interval
            except Exception as e:
                socketio.emit('error', {'message': str(e)})
                simulation_running = False
                break

    simulation_thread = threading.Thread(target=run_simulation)
    simulation_thread.daemon = True
    simulation_thread.start()


@socketio.on('pause_simulation')
def handle_pause_simulation():
    global simulation_running, current_frame, solver
    simulation_running = False
    if solver:
        socketio.emit('simulation_paused', {
            'frame': current_frame,
            'time': round(current_frame * solver.dt, 4)
        })


@socketio.on('reset_simulation')
def handle_reset_simulation():
    global simulation_running, current_frame, solver, initial_state
    simulation_running = False
    current_frame = 0

    if solver and last_config and initial_state:
        try:
            nx = int(last_config.get('nx', 50))
            ny = int(last_config.get('ny', 50))
            alpha = float(last_config.get('alpha', 0.01))
            dx = float(last_config.get('dx', 1.0))
            dy = float(last_config.get('dy', 1.0))
            dt = float(last_config.get('dt', 0.1))

            solver = HeatEquationSolver2D(nx=nx, ny=ny, alpha=alpha, dx=dx, dy=dy, dt=dt)

            pattern = last_config.get('pattern', 'center_square')
            center_temp = float(last_config.get('center_temp', 100.0))
            background_temp = float(last_config.get('background_temp', 0.0))
            square_size = float(last_config.get('square_size', 0.2))
            solver.set_initial_condition(
                pattern=pattern,
                center_temp=center_temp,
                background_temp=background_temp,
                square_size=square_size
            )

            bc_mapping = {'left': 'left', 'right': 'right', 'top': 'top', 'bottom': 'bottom'}
            for side_key, side_name in bc_mapping.items():
                bc_type = last_config.get(f'bc_{side_key}_type', 'fixed')
                bc_value = float(last_config.get(f'bc_{side_key}_value', 0.0))
                solver.set_boundary_condition(side_name, bc_type, bc_value)

            initial_state = solver.get_state()
            socketio.emit('reset_done', {
                'state': initial_state,
                'frame': 0,
                'time': 0.0
            })
        except Exception as e:
            socketio.emit('error', {'message': str(e)})


@socketio.on('step_once')
def handle_step_once(data):
    global solver, current_frame
    if solver is None:
        return
    steps = int(data.get('steps', 1))
    solver.step(steps)
    current_frame += steps
    current_time = current_frame * solver.dt
    socketio.emit('update', {
        'state': solver.get_state(),
        'frame': current_frame,
        'time': round(current_time, 4)
    })


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
