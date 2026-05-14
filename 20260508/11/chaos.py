import math


def logistic_map(x, r):
    x = max(1e-10, min(1.0 - 1e-10, x))
    result = r * x * (1 - x)
    return max(1e-10, min(1.0 - 1e-10, result))


def iterate_logistic(r, x0, n_iterations=1000, n_transient=100):
    x0 = max(1e-10, min(1.0 - 1e-10, x0))
    x = [0.0] * (n_iterations + n_transient)
    x[0] = float(x0)
    
    for i in range(1, n_iterations + n_transient):
        x[i] = logistic_map(x[i-1], r)
    
    return x[n_transient:]


def calculate_lyapunov(r, x0, n_iterations=1000):
    x0 = max(1e-10, min(1.0 - 1e-10, x0))
    x = float(x0)
    lyapunov_sum = 0.0
    eps = 1e-12
    
    for _ in range(n_iterations):
        derivative = r * (1 - 2 * x)
        abs_derivative = abs(derivative)
        if abs_derivative < eps:
            abs_derivative = eps
        lyapunov_sum += math.log(abs_derivative)
        x = logistic_map(x, r)
    
    return lyapunov_sum / n_iterations


def generate_bifurcation(r_min=0.0, r_max=4.0, r_steps=500, n_iterations=500, n_last=50, x0=0.5):
    step = (r_max - r_min) / max(r_steps - 1, 1)
    all_x_values = []
    all_r_values = []
    
    for step_idx in range(r_steps):
        r = r_min + step_idx * step
        x = max(1e-10, min(1.0 - 1e-10, x0))
        transient = 300
        
        for _ in range(transient):
            x = logistic_map(x, r)
        
        x_values = []
        for _ in range(n_iterations):
            x = logistic_map(x, r)
            x_values.append(x)
        
        x_values = x_values[-n_last:]
        for x_val in x_values:
            all_r_values.append(float(r))
            all_x_values.append(float(x_val))
    
    return all_r_values, all_x_values


def generate_lyapunov_vs_r(r_min=0.0, r_max=4.0, r_steps=300, x0=0.5, n_iterations=300):
    step = (r_max - r_min) / max(r_steps - 1, 1)
    r_values = []
    lyapunov_values = []
    
    for step_idx in range(r_steps):
        r = r_min + step_idx * step
        lyapunov = calculate_lyapunov(r, x0, n_iterations)
        r_values.append(float(r))
        lyapunov_values.append(float(lyapunov))
    
    return r_values, lyapunov_values
