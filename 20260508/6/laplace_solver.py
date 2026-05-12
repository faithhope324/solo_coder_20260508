import numpy as np
import matplotlib.pyplot as plt

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

# 主函数
if __name__ == '__main__':
    # 设置参数
    d = 0.1  # 板间距 (m)
    V1 = 10  # 左板电压 (V)
    V2 = 0   # 右板电压 (V)
    
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
    X, Y = np.meshgrid(x, y)
    
    # 生成电势等高线图
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # 绘制等高线
    contour = ax.contourf(X, Y, V, 20, cmap='viridis')
    fig.colorbar(contour, ax=ax, label='Potential (V)')
    
    # 绘制电场线（箭头）
    skip = 5
    ax.quiver(X[::skip, ::skip], Y[::skip, ::skip], Ex[::skip, ::skip], Ey[::skip, ::skip], 
              scale=50, color='white')
    
    # 绘制极板
    ax.axhline(d, color='red', linewidth=2)
    ax.axhline(0, color='red', linewidth=2)
    
    ax.set_xlabel('x (m)')
    ax.set_ylabel('y (m)')
    ax.set_title('Potential and Electric Field Distribution')
    ax.set_aspect('equal')
    
    # 保存图像
    plt.savefig('laplace_result.png')
    print("计算完成，结果已保存为 laplace_result.png")
