from flask import Flask, render_template, request, jsonify
from chaos import iterate_logistic, calculate_lyapunov, generate_bifurcation, generate_lyapunov_vs_r
import traceback
import sys

app = Flask(__name__)

print("=" * 50, file=sys.stderr)
print("Flask app starting...", file=sys.stderr)
print("=" * 50, file=sys.stderr)


@app.route('/')
def index():
    print("Request: GET /", file=sys.stderr)
    return render_template('index.html')


def validate_analyze_params(data):
    errors = []
    
    if 'r' not in data:
        errors.append('缺少生长参数 r')
    else:
        try:
            r = float(data['r'])
            if r < 0 or r > 4:
                errors.append(f'生长参数 r 必须在 0 到 4 之间，当前值: {r}')
        except (ValueError, TypeError):
            errors.append('生长参数 r 必须是有效的数字')
    
    if 'x0' not in data:
        errors.append('缺少初始值 x0')
    else:
        try:
            x0 = float(data['x0'])
            if x0 <= 0 or x0 >= 1:
                errors.append(f'初始值 x0 必须在 0 到 1 之间（不包括边界），当前值: {x0}')
        except (ValueError, TypeError):
            errors.append('初始值 x0 必须是有效的数字')
    
    if 'n_iterations' in data:
        try:
            n_iterations = int(data['n_iterations'])
            if n_iterations < 100 or n_iterations > 10000:
                errors.append(f'迭代次数必须在 100 到 10000 之间，当前值: {n_iterations}')
        except (ValueError, TypeError):
            errors.append('迭代次数必须是有效的整数')
    
    return errors


@app.route('/api/analyze', methods=['POST'])
def analyze():
    print("Request: POST /api/analyze", file=sys.stderr)
    try:
        data = request.get_json()
        print(f"  Request data: {data}", file=sys.stderr)
        
        if data is None:
            return jsonify({'error': '请求格式错误，请发送 JSON 数据'}), 400
        
        validation_errors = validate_analyze_params(data)
        if validation_errors:
            error_msg = '; '.join(validation_errors)
            print(f"  Validation errors: {error_msg}", file=sys.stderr)
            return jsonify({'error': error_msg}), 400
        
        r = float(data.get('r', 3.8))
        x0 = float(data.get('x0', 0.5))
        n_iterations = int(data.get('n_iterations', 1000))
        
        print(f"  Parameters: r={r}, x0={x0}, n_iter={n_iterations}", file=sys.stderr)
        
        time_series = iterate_logistic(r, x0, n_iterations, n_transient=100)
        print(f"  Time series length: {len(time_series)}", file=sys.stderr)
        
        lyapunov = calculate_lyapunov(r, x0, n_iterations=1000)
        print(f"  Lyapunov exponent: {lyapunov}", file=sys.stderr)
        
        response = {
            'time_series': time_series,
            'lyapunov_exponent': lyapunov,
            'r': r,
            'x0': x0
        }
        
        print(f"  Response keys: {list(response.keys())}", file=sys.stderr)
        return jsonify(response)
        
    except Exception as e:
        print("=" * 50, file=sys.stderr)
        print(f"ERROR in /api/analyze: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        print("=" * 50, file=sys.stderr)
        return jsonify({
            'error': str(e),
            'time_series': [],
            'lyapunov_exponent': 0.0
        }), 500


def validate_bifurcation_params(data):
    errors = []
    
    if 'r_min' in data:
        try:
            r_min = float(data['r_min'])
            if r_min < 0 or r_min > 4:
                errors.append(f'r_min 必须在 0 到 4 之间，当前值: {r_min}')
        except (ValueError, TypeError):
            errors.append('r_min 必须是有效的数字')
    
    if 'r_max' in data:
        try:
            r_max = float(data['r_max'])
            if r_max < 0 or r_max > 4:
                errors.append(f'r_max 必须在 0 到 4 之间，当前值: {r_max}')
        except (ValueError, TypeError):
            errors.append('r_max 必须是有效的数字')
    
    if 'r_min' in data and 'r_max' in data:
        try:
            r_min = float(data['r_min'])
            r_max = float(data['r_max'])
            if r_min >= r_max:
                errors.append(f'r_min ({r_min}) 必须小于 r_max ({r_max})')
        except (ValueError, TypeError):
            pass
    
    if 'r_steps' in data:
        try:
            r_steps = int(data['r_steps'])
            if r_steps < 100 or r_steps > 1000:
                errors.append(f'r_steps 必须在 100 到 1000 之间，当前值: {r_steps}')
        except (ValueError, TypeError):
            errors.append('r_steps 必须是有效的整数')
    
    return errors


@app.route('/api/bifurcation', methods=['POST'])
def bifurcation():
    print("Request: POST /api/bifurcation", file=sys.stderr)
    try:
        data = request.get_json()
        print(f"  Request data: {data}", file=sys.stderr)
        
        if data is None:
            data = {}
        
        validation_errors = validate_bifurcation_params(data)
        if validation_errors:
            error_msg = '; '.join(validation_errors)
            print(f"  Validation errors: {error_msg}", file=sys.stderr)
            return jsonify({'error': error_msg}), 400
        
        r_min = float(data.get('r_min', 0.0))
        r_max = float(data.get('r_max', 4.0))
        r_steps = int(data.get('r_steps', 500))
        
        r_steps = max(100, min(500, r_steps))
        
        print(f"  Parameters: r_min={r_min}, r_max={r_max}, r_steps={r_steps}", file=sys.stderr)
        
        r_values, x_values = generate_bifurcation(r_min, r_max, r_steps)
        print(f"  Bifurcation: {len(r_values)} points", file=sys.stderr)
        
        r_lyapunov, lyapunov_values = generate_lyapunov_vs_r(r_min, r_max)
        print(f"  Lyapunov curve: {len(r_lyapunov)} points", file=sys.stderr)
        
        response = {
            'bifurcation_r': r_values,
            'bifurcation_x': x_values,
            'lyapunov_r': r_lyapunov,
            'lyapunov_values': lyapunov_values
        }
        
        print(f"  Response keys: {list(response.keys())}", file=sys.stderr)
        return jsonify(response)
        
    except Exception as e:
        print("=" * 50, file=sys.stderr)
        print(f"ERROR in /api/bifurcation: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        print("=" * 50, file=sys.stderr)
        return jsonify({
            'error': str(e),
            'bifurcation_r': [],
            'bifurcation_x': [],
            'lyapunov_r': [],
            'lyapunov_values': []
        }), 500


if __name__ == '__main__':
    print("=" * 50, file=sys.stderr)
    print("Starting Flask development server on http://localhost:5000", file=sys.stderr)
    print("=" * 50, file=sys.stderr)
    app.run(debug=True, port=5000)
