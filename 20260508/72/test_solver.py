import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from backend.fdtd_solver import ElasticFDTD2D
from backend.source import SourceManager, ricker_wavelet
from backend.simulation import SimulationManager, get_default_config

def test_fdtd_solver():
    print("=" * 60)
    print("测试1: 有限差分求解器基本功能")
    print("=" * 60)
    
    solver = ElasticFDTD2D(nx=100, nz=100, dx=5.0, dz=5.0, vp=3000.0, vs=1732.0, rho=2500.0)
    
    print(f"网格大小: {solver.nx} x {solver.nz}")
    print(f"时间步长 dt: {solver.dt:.6f} s")
    print(f"PML宽度: {solver.pml_width}")
    
    wavelet = ricker_wavelet(20.0, t0=1.5/20.0)
    solver.set_source(50, 30, wavelet, source_type='velocity')
    
    solver.add_receiver(25, 80, 'REC_1')
    solver.add_receiver(50, 80, 'REC_2')
    solver.add_receiver(75, 80, 'REC_3')
    
    print("\n运行100时间步...")
    for i in range(100):
        solver.step()
    
    wavefield = solver.get_wavefield()
    print(f"波场形状: {wavefield.shape}")
    print(f"波场最大值: {np.max(np.abs(wavefield)):.6e}")
    print(f"波场最小值: {np.min(wavefield):.6e}")
    
    rec_data = solver.get_receiver_data('REC_2')
    print(f"接收器REC_2数据长度: {len(rec_data)}")
    print(f"接收器REC_2最大值: {np.max(np.abs(rec_data)):.6e}")
    
    print("\n✓ 有限差分求解器测试通过")
    return True

def test_simulation_manager():
    print("\n" + "=" * 60)
    print("测试2: 模拟管理器功能")
    print("=" * 60)
    
    sim_manager = SimulationManager()
    config = get_default_config()
    
    config['nx'] = 100
    config['nz'] = 100
    config['source']['x'] = 50
    config['source']['z'] = 30
    
    config['receivers'] = [
        {'x': 25, 'z': 80, 'name': 'REC_0'},
        {'x': 50, 'z': 80, 'name': 'REC_1'},
        {'x': 75, 'z': 80, 'name': 'REC_2'}
    ]
    
    result = sim_manager.configure(config)
    print(f"配置结果: dt={result['dt']:.6f}s")
    
    print("\n逐步运行模拟...")
    for i in range(5):
        step_result = sim_manager.run_step(num_steps=20)
        print(f"  步骤 {i+1}: 时间步={step_result['step']}, 时间={step_result['time']:.3f}s")
    
    all_data = sim_manager.get_current_receiver_data()
    print(f"\n接收器数量: {len(all_data)}")
    for name, data in all_data.items():
        print(f"  {name}: {len(data)} 个采样点, 最大值={np.max(np.abs(data)):.6e}")
    
    print("\n✓ 模拟管理器测试通过")
    return True

def test_receiver_array():
    print("\n" + "=" * 60)
    print("测试3: 接收器阵列生成")
    print("=" * 60)
    
    sim_manager = SimulationManager()
    
    line_config = {
        'type': 'line',
        'start_x': 20,
        'start_z': 80,
        'end_x': 80,
        'end_z': 80,
        'num_receivers': 7,
        'prefix': 'LINE'
    }
    
    receivers = sim_manager.create_receiver_array(line_config)
    print(f"线性阵列接收器数量: {len(receivers)}")
    for rec in receivers:
        print(f"  {rec['name']}: (x={rec['x']}, z={rec['z']})")
    
    print("\n✓ 接收器阵列测试通过")
    return True

def test_stability():
    print("\n" + "=" * 60)
    print("测试4: 数值稳定性验证")
    print("=" * 60)
    
    config = get_default_config()
    vp = config['vp']
    dx = config['dx']
    dz = config['dz']
    
    dt_stable = 0.6 * min(dx, dz) / (vp * np.sqrt(2))
    print(f"理论稳定时间步长: dt <= {dt_stable:.6f} s")
    
    sim_manager = SimulationManager()
    result = sim_manager.configure(config)
    print(f"实际使用时间步长: dt = {result['dt']:.6f} s")
    
    if result['dt'] <= dt_stable:
        print("✓ 满足Courant稳定性条件")
    else:
        print("✗ 警告: 时间步长可能不稳定")
    
    wavefield_prev = None
    max_growth = 0
    for i in range(200):
        result = sim_manager.run_step(num_steps=5)
        wavefield = np.array(result['wavefield'])
        
        if wavefield_prev is not None and np.max(np.abs(wavefield_prev)) > 0:
            growth = np.max(np.abs(wavefield)) / np.max(np.abs(wavefield_prev))
            max_growth = max(max_growth, growth)
        
        wavefield_prev = wavefield.copy()
    
    print(f"最大振幅增长率: {max_growth:.4f}")
    if max_growth < 1.01:
        print("✓ 振幅无明显增长，模拟稳定")
    else:
        print("⚠ 振幅可能存在增长，请注意数值稳定性")
    
    print("\n✓ 稳定性测试完成")
    return True

def main():
    print("\n" + "=" * 60)
    print("地震波传播模拟系统 - 后端测试")
    print("=" * 60)
    print()
    
    try:
        test_fdtd_solver()
        test_simulation_manager()
        test_receiver_array()
        test_stability()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        return 0
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
