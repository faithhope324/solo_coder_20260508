import numpy as np
import pyvista as pv

def generate_xyz_file(n_points, filepath):
    x = np.random.uniform(-10, 10, n_points)
    y = np.random.uniform(-10, 10, n_points)
    z = np.sin(x * 0.5) * np.cos(y * 0.5) * 5 + np.random.normal(0, 0.1, n_points)
    
    points = np.column_stack([x, y, z])
    np.savetxt(filepath, points, fmt='%.6f')
    print(f"已生成 {filepath}，包含 {n_points} 个点")

def generate_ply_file(n_points, filepath):
    x = np.random.uniform(-10, 10, n_points)
    y = np.random.uniform(-10, 10, n_points)
    z = np.exp(-(x**2 + y**2) / 20) * 10 + np.random.normal(0, 0.2, n_points)
    
    points = np.column_stack([x, y, z])
    mesh = pv.PolyData(points)
    mesh.save(filepath)
    print(f"已生成 {filepath}，包含 {n_points} 个点")

if __name__ == '__main__':
    generate_xyz_file(50000, 'test_50000_points.xyz')
    generate_ply_file(100000, 'test_100000_points.ply')
