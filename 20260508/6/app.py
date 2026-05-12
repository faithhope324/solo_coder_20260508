from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

# 有限差分法求解二维拉普拉斯方程
def solve_laplace(dx, dy, nx, ny, V1, V2, max_iter=10000, tol=1e-4):
    # 初始化电势矩阵
    V = np.zeros((nx, ny))
    
    # 设置边界条件（上下极板）
    V[0, :] = V1  # 上板
    V[-1, :] = V2  # 下板
    
    # 迭代求解
    for _ in range(max_iter):
        V_old = V.copy()
        # 内部点
        V[1:-1, 1:-1] = 0.25 * (V[1:-1, 0:-2] + V[1:-1, 2:] + V[0:-2, 1:-1] + V[2:, 1:-1])
        # 检查收敛
        if np.max(np.abs(V - V_old)) < tol:
            break
    
    return V

# 计算电场
def calculate_efield(V, dx, dy):
    # 避免分母过小导致的数值问题
    dx = max(dx, 1e-6)
    dy = max(dy, 1e-6)
    Ex, Ey = np.gradient(-V, dx, dy)
    # 限制电场值范围，避免数值溢出
    Ex = np.clip(Ex, -1e6, 1e6)
    Ey = np.clip(Ey, -1e6, 1e6)
    return Ex, Ey

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    # 获取参数
    d = float(request.form['d'])
    V1 = float(request.form['V1'])
    V2 = float(request.form['V2'])
    
    # 设置网格参数
    nx, ny = 50, 50
    dx, dy = d / (nx - 1), d / (ny - 1)
    
    # 求解
    V = solve_laplace(dx, dy, nx, ny, V1, V2)
    
    # 计算电场
    Ex, Ey = calculate_efield(V, dx, dy)
    
    # 生成网格数据
    x = np.linspace(0, d, nx)
    y = np.linspace(0, d, ny)
    
    # 准备数据返回
    data = {
        'x': x.tolist(),
        'y': y.tolist(),
        'V': V.tolist(),
        'Ex': Ex.tolist(),
        'Ey': Ey.tolist(),
        'd': d,
        'V1': V1,
        'V2': V2
    }
    
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
