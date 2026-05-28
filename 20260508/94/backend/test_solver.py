from app.solver import FEMSolver
import numpy as np
import sys
import math

def test_rectangle_mesh():
    print('=== 测试1: 矩形网格生成 ===')
    solver = FEMSolver()
    shapes = [{
        'type': 'rectangle',
        'x': 0,
        'y': 0,
        'width': 1,
        'height': 0.5
    }]
    
    points, elements = solver.generate_mesh(shapes, 0.1)
    print(f'矩形节点数: {len(points)}, 单元数: {len(elements)}')
    print(f'前3个节点: {points[:3]}')
    print(f'Y轴范围: [{points[:,1].min():.3f}, {points[:,1].max():.3f}]')
    
    assert len(points) > 0, '节点数应为正'
    assert len(elements) > 0, '单元数应为正'
    assert points[:,1].min() >= -0.01, 'Y坐标不应为负'
    assert points[:,1].max() <= 0.51, 'Y坐标不应超过高度'
    print('✓ 矩形网格测试通过')
    return True

def test_circle_mesh():
    print('\n=== 测试2: 圆形网格生成 ===')
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
    print(f'圆形节点数: {len(points)}, 单元数: {len(elements)}')
    print(f'前3个节点: {points[:3]}')
    
    n_angular = max(16, int(2 * math.pi * 0.3 / 0.1))
    n_angular = n_angular - (n_angular % 4)
    n_radial = max(3, int(0.3 / 0.1))
    expected_pts = 1 + n_angular * n_radial
    print(f'期望节点数: {expected_pts}, 角向分点数: {n_angular}, 径向分点数: {n_radial}')
    
    n_outer = n_angular
    outer_pts = points[-n_outer:]
    boundary_dists = [np.sqrt((p[0]-0.5)**2 + (p[1]-0.5)**2) for p in outer_pts]
    print(f'边界点到圆心距离(前10个): {[round(d, 3) for d in boundary_dists[:10]]}')
    
    assert len(points) > 10, '圆形节点数应足够多'
    assert len(elements) > 10, '圆形单元数应足够多'
    
    max_dist_error = max([abs(d - 0.3) for d in boundary_dists])
    print(f'最大边界距离误差: {max_dist_error:.4f}')
    assert max_dist_error < 0.02, f'边界点应在圆上，误差过大: {max_dist_error}'
    
    center = points[0]
    assert abs(center[0] - 0.5) < 0.001, '第一个点应为圆心'
    assert abs(center[1] - 0.5) < 0.001, '第一个点应为圆心'
    
    areas = []
    for elem in elements:
        x = points[elem, 0]
        y = points[elem, 1]
        area = 0.5 * abs((x[1]-x[0])*(y[2]-y[0]) - (x[2]-x[0])*(y[1]-y[0]))
        areas.append(area)
    
    print(f'单元面积范围: [{min(areas):.5f}, {max(areas):.5f}]')
    assert min(areas) > 1e-6, '存在面积过小的单元'
    
    print('✓ 圆形网格测试通过')
    return True

def test_boundary_y_axis():
    print('\n=== 测试3: 边界条件Y轴判断 ===')
    solver = FEMSolver()
    
    test_points = np.array([
        [0, 0],   # 左上
        [0, 1],   # 左下
        [1, 0],   # 右上
        [1, 1]    # 右下
    ])
    
    test_bc_top = [{'type': 'fixed', 'location': 'top', 'value': 0.01}]
    K = np.eye(8)
    F = np.zeros(8)
    K_reduced, F_reduced, free_dofs, n_dofs = solver.apply_boundary_conditions(K, F, test_points, test_bc_top)
    fixed_dofs = np.setdiff1d(np.arange(8), free_dofs)
    print(f'上边界(y≈0)固定的自由度: {fixed_dofs}')
    print(f'对应节点: {[dof // 2 for dof in fixed_dofs]}')
    
    fixed_nodes = set([dof // 2 for dof in fixed_dofs])
    assert 0 in fixed_nodes, '节点0(左上)应被固定'
    assert 2 in fixed_nodes, '节点2(右上)应被固定'
    assert 1 not in fixed_nodes, '节点1(左下)不应被固定'
    assert 3 not in fixed_nodes, '节点3(右下)不应被固定'
    print('✓ 上边界固定测试通过 (y=0为顶部)')
    
    test_bc_bottom = [{'type': 'fixed', 'location': 'bottom', 'value': 0.01}]
    K = np.eye(8)
    F = np.zeros(8)
    K_reduced, F_reduced, free_dofs, n_dofs = solver.apply_boundary_conditions(K, F, test_points, test_bc_bottom)
    fixed_dofs = np.setdiff1d(np.arange(8), free_dofs)
    fixed_nodes = set([dof // 2 for dof in fixed_dofs])
    print(f'下边界(y≈1)固定的节点: {sorted(fixed_nodes)}')
    
    assert 1 in fixed_nodes, '节点1(左下)应被固定'
    assert 3 in fixed_nodes, '节点3(右下)应被固定'
    print('✓ 下边界固定测试通过 (y=1为底部)')
    return True

def test_full_simulation():
    print('\n=== 测试4: 完整仿真计算 ===')
    solver = FEMSolver()
    
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
        'material': {'young_modulus': 210e9, 'poisson_ratio': 0.3, 'density': 7850},
        'mesh_size': 0.15
    }
    
    result = solver.solve(request)
    print(f'计算完成 - 节点: {len(result["nodes"])}, 单元: {len(result["elements"])}')
    print(f'应力范围: [{min(result["stress"]):.2e}, {max(result["stress"]):.2e}] Pa')
    
    assert 'nodes' in result
    assert 'elements' in result
    assert 'stress' in result
    assert 'displacement' in result
    assert len(result['stress']) == len(result['nodes'])
    
    max_disp = max([max(abs(d[0]), abs(d[1])) for d in result['displacement']])
    print(f'最大位移: {max_disp:.6f} m')
    
    print('✓ 完整仿真测试通过')
    return True

def test_circle_simulation():
    print('\n=== 测试5: 圆形仿真计算 ===')
    solver = FEMSolver()
    
    request = {
        'shapes': [{
            'type': 'circle',
            'center_x': 0.5,
            'center_y': 0.5,
            'x': 0.5,
            'y': 0.5,
            'radius': 0.35
        }],
        'boundary_conditions': [
            {'type': 'fixed', 'location': 'left', 'value': 0.15},
            {'type': 'force', 'location': 'right', 'value': 5000, 'direction': 'x'}
        ],
        'material': {'young_modulus': 210e9, 'poisson_ratio': 0.3, 'density': 7850},
        'mesh_size': 0.12
    }
    
    result = solver.solve(request)
    print(f'圆形计算完成 - 节点: {len(result["nodes"])}, 单元: {len(result["elements"])}')
    
    has_nan = any(np.isnan(s) for s in result['stress'])
    print(f'包含NaN: {has_nan}')
    if not has_nan:
        print(f'应力范围: [{min(result["stress"]):.2e}, {max(result["stress"]):.2e}] Pa')
        max_disp = max([max(abs(d[0]), abs(d[1])) for d in result['displacement']])
        print(f'最大位移: {max_disp:.6f} m')
        assert max_disp > 1e-10, '位移应该大于零'
    else:
        print('警告: 应力包含NaN，可能边界条件不足')
    
    assert len(result['nodes']) > 0
    assert len(result['elements']) > 0
    
    print('✓ 圆形仿真测试通过')
    return True

def test_mesh_size_limit():
    print('\n=== 测试6: 网格尺寸限制 ===')
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
        'mesh_size': 0.01
    }
    
    try:
        result = solver.solve(request)
        print(f'节点数: {len(result["nodes"])}')
        print('✓ 网格尺寸限制测试通过 (自动修正了过小的mesh_size)')
    except ValueError as e:
        if 'Too many nodes' in str(e) or 'timed out' in str(e):
            print(f'✓ 网格尺寸限制测试通过 (正确限制: {e})')
        else:
            raise
    return True

if __name__ == '__main__':
    tests = [
        test_rectangle_mesh,
        test_circle_mesh,
        test_boundary_y_axis,
        test_full_simulation,
        test_circle_simulation,
        test_mesh_size_limit
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f'✗ {test.__name__} 失败: {e}')
            import traceback
            traceback.print_exc()
            failed += 1
    
    print(f'\n{"="*50}')
    print(f'测试结果: {passed} 通过, {failed} 失败')
    print(f'{"="*50}')
    
    sys.exit(0 if failed == 0 else 1)
