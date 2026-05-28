# -*- coding: utf-8 -*-
from app.solver import FEMSolver
import numpy as np
import sys

def verify_y_axis_fix():
    print("=== 验证1: Y轴坐标系修复 ===")
    solver = FEMSolver()
    
    # 测试边界条件Y轴方向
    test_points = np.array([
        [0, 0],   # 左上
        [0, 1],   # 左下
        [1, 0],   # 右上
        [1, 1]    # 右下
    ])
    
    # 测试上边界固定 (y=0应为顶部)
    bc_top = [{'type': 'fixed', 'location': 'top', 'value': 0.01}]
    K = np.eye(8)
    F = np.zeros(8)
    _, _, free_dofs, _ = solver.apply_boundary_conditions(K, F, test_points, bc_top)
    fixed_dofs = np.setdiff1d(np.arange(8), free_dofs)
    fixed_nodes = set([dof // 2 for dof in fixed_dofs])
    
    print(f"上边界(top)固定的节点: {sorted(fixed_nodes)}")
    print(f"期望: 节点0(左上)和节点2(右上) - y坐标为0")
    ok1 = 0 in fixed_nodes and 2 in fixed_nodes
    
    # 测试下边界固定 (y=1应为底部)
    bc_bottom = [{'type': 'fixed', 'location': 'bottom', 'value': 0.01}]
    K = np.eye(8)
    F = np.zeros(8)
    _, _, free_dofs, _ = solver.apply_boundary_conditions(K, F, test_points, bc_bottom)
    fixed_dofs = np.setdiff1d(np.arange(8), free_dofs)
    fixed_nodes = set([dof // 2 for dof in fixed_dofs])
    
    print(f"下边界(bottom)固定的节点: {sorted(fixed_nodes)}")
    print(f"期望: 节点1(左下)和节点3(右下) - y坐标为1")
    ok2 = 1 in fixed_nodes and 3 in fixed_nodes
    
    result = ok1 and ok2
    print(f"Y轴修复验证: {'通过' if result else '失败'}")
    return result

def verify_circle_mesh():
    print("\n=== 验证2: 圆形网格生成修复 ===")
    solver = FEMSolver()
    shapes = [{
        'type': 'circle',
        'center_x': 0.5,
        'center_y': 0.5,
        'x': 0.5,
        'y': 0.5,
        'radius': 0.3
    }]
    
    points, elements = solver.generate_mesh(shapes, 0.1)
    print(f"节点数: {len(points)}, 单元数: {len(elements)}")
    print(f"第一个节点(圆心): ({points[0][0]:.3f}, {points[0][1]:.3f})")
    
    # 检查边界点是否在圆上
    n_angular = max(16, int(2 * math.pi * 0.3 / 0.1))
    n_angular = n_angular - (n_angular % 4)
    outer_pts = points[-n_angular:]
    dists = [np.sqrt((p[0]-0.5)**2 + (p[1]-0.5)**2) for p in outer_pts]
    max_error = max([abs(d - 0.3) for d in dists])
    print(f"边界点最大半径误差: {max_error:.5f}")
    
    # 检查单元面积
    areas = []
    for elem in elements:
        x = points[elem, 0]
        y = points[elem, 1]
        area = 0.5 * abs((x[1]-x[0])*(y[2]-y[0]) - (x[2]-x[0])*(y[1]-y[0]))
        areas.append(area)
    print(f"单元面积范围: [{min(areas):.6f}, {max(areas):.6f}]")
    
    ok1 = max_error < 0.02
    ok2 = min(areas) > 1e-6
    ok3 = len(points) > 10 and len(elements) > 10
    
    result = ok1 and ok2 and ok3
    print(f"圆形网格验证: {'通过' if result else '失败'}")
    return result

def verify_mesh_size_limit():
    print("\n=== 验证3: 网格尺寸限制修复 ===")
    solver = FEMSolver()
    
    request = {
        'shapes': [{
            'type': 'rectangle',
            'x': 0,
            'y': 0,
            'width': 1,
            'height': 1
        }],
        'boundary_conditions': [
            {'type': 'fixed', 'location': 'left', 'value': 0.01}
        ],
        'material': {'young_modulus': 210e9, 'poisson_ratio': 0.3},
        'mesh_size': 0.02
    }
    
    result = solver.solve(request)
    n_nodes = len(result['nodes'])
    print(f"请求mesh_size=0.02，实际生成节点数: {n_nodes}")
    print(f"最大允许节点数: 5000")
    
    # 如果mesh_size被自动修正为0.05，节点数应该较少
    expected_max = (1/0.05 + 1) * (1/0.05 + 1)  # 21x21=441
    ok1 = n_nodes <= 500
    ok2 = n_nodes <= expected_max + 100
    
    result = ok1 and ok2
    print(f"网格尺寸限制验证: {'通过' if result else '失败'}")
    return result

def verify_full_simulation():
    print("\n=== 验证4: 完整仿真流程 ===")
    solver = FEMSolver()
    
    # 测试矩形拉伸问题
    request = {
        'shapes': [{
            'type': 'rectangle',
            'x': 0,
            'y': 0.25,
            'width': 1,
            'height': 0.5
        }],
        'boundary_conditions': [
            {'type': 'fixed', 'location': 'left', 'value': 0.01},
            {'type': 'force', 'location': 'right', 'value': 10000, 'direction': 'x'}
        ],
        'material': {'young_modulus': 210e9, 'poisson_ratio': 0.3},
        'mesh_size': 0.1
    }
    
    result = solver.solve(request)
    stress = np.array(result['stress'])
    disp = np.array(result['displacement'])
    
    print(f"节点: {len(result['nodes'])}, 单元: {len(result['elements'])}")
    print(f"应力范围: [{stress.min():.2e}, {stress.max():.2e}] Pa")
    print(f"最大位移: {np.max(np.abs(disp)):.6f} m")
    
    ok1 = len(result['nodes']) > 0
    ok2 = not np.any(np.isnan(stress))
    ok3 = np.max(np.abs(disp)) > 1e-10
    
    result = ok1 and ok2 and ok3
    print(f"完整仿真验证: {'通过' if result else '失败'}")
    return result

if __name__ == '__main__':
    import math
    
    results = []
    results.append(verify_y_axis_fix())
    results.append(verify_circle_mesh())
    results.append(verify_mesh_size_limit())
    results.append(verify_full_simulation())
    
    print("\n" + "="*50)
    passed = sum(results)
    total = len(results)
    print(f"验证结果: {passed}/{total} 通过")
    print("="*50)
    
    sys.exit(0 if all(results) else 1)
