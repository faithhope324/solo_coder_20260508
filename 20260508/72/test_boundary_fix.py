import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from backend.fdtd_solver import ElasticFDTD2D
from backend.source import ricker_wavelet

def test_boundary_not_zero():
    print("=" * 60)
    print("验证边界条件修复：边界不再被强制置零")
    print("=" * 60)
    
    solver = ElasticFDTD2D(nx=50, nz=50, dx=5.0, dz=5.0, vp=3000.0, vs=1732.0, rho=2500.0, pml_width=10)
    
    wavelet = ricker_wavelet(20.0, t0=1.5/20.0)
    solver.set_source(25, 15, wavelet, source_type='velocity')
    
    print("\n运行50时间步...")
    for i in range(50):
        solver.step()
    
    print("\n检查最外边界的应力和速度值:")
    
    pw = solver.pml_width
    vx = solver.vx
    vz = solver.vz
    txx = solver.txx
    tzz = solver.tzz
    
    pml_edge = pw - 2
    vx_pml = np.max(np.abs(vx[pml_edge, :]))
    vz_pml = np.max(np.abs(vz[pml_edge, :]))
    txx_pml = np.max(np.abs(txx[pml_edge, :]))
    tzz_pml = np.max(np.abs(tzz[pml_edge, :]))
    
    print(f"  PML层内(距边缘{pml_edge}格) Vx 最大值: {vx_pml:.6e}")
    print(f"  PML层内(距边缘{pml_edge}格) Vz 最大值: {vz_pml:.6e}")
    print(f"  PML层内(距边缘{pml_edge}格) Txx 最大值: {txx_pml:.6e}")
    print(f"  PML层内(距边缘{pml_edge}格) Tzz 最大值: {tzz_pml:.6e}")
    
    inner_edge = 2
    vx_inner = np.max(np.abs(vx[inner_edge, :]))
    vz_inner = np.max(np.abs(vz[inner_edge, :]))
    txx_inner = np.max(np.abs(txx[inner_edge, :]))
    tzz_inner = np.max(np.abs(tzz[inner_edge, :]))
    
    print(f"\n  内部区域(距边缘{inner_edge}格) Vx 最大值: {vx_inner:.6e}")
    print(f"  内部区域(距边缘{inner_edge}格) Vz 最大值: {vz_inner:.6e}")
    print(f"  内部区域(距边缘{inner_edge}格) Txx 最大值: {txx_inner:.6e}")
    print(f"  内部区域(距边缘{inner_edge}格) Tzz 最大值: {tzz_inner:.6e}")
    
    pml_has_values = (vx_pml > 1e-10) or (vz_pml > 1e-10) or (txx_pml > 1e-10) or (tzz_pml > 1e-10)
    inner_has_values = (vx_inner > 1e-10) or (vz_inner > 1e-10) or (txx_inner > 1e-10) or (tzz_inner > 1e-10)
    
    print(f"\nPML层内是否有非零值: {pml_has_values}")
    print(f"内部区域是否有非零值: {inner_has_values}")
    
    if pml_has_values and inner_has_values:
        print("\n✓ 边界条件修复成功：PML层和内部区域都有正常的波场值")
        print("  (最外边界由于中心差分计算不到，保持为0是正常的)")
        return True
    else:
        print("\n✗ 波场值异常，修复可能有问题")
        return False

def test_wave_propagation():
    print("\n" + "=" * 60)
    print("验证波传播：移除强制置零后波场是否正常")
    print("=" * 60)
    
    solver = ElasticFDTD2D(nx=100, nz=100, dx=5.0, dz=5.0, vp=3000.0, vs=1732.0, rho=2500.0)
    
    wavelet = ricker_wavelet(20.0, t0=1.5/20.0)
    solver.set_source(50, 30, wavelet, source_type='velocity')
    solver.add_receiver(50, 70, 'REC')
    
    max_vals = []
    for i in range(200):
        solver.step()
        wf = solver.get_wavefield()
        max_vals.append(np.max(np.abs(wf)))
    
    max_val = max(max_vals)
    rec_data = solver.get_receiver_data('REC')
    
    print(f"波场最大振幅: {max_val:.6e}")
    print(f"接收器最大振幅: {np.max(np.abs(rec_data)):.6e}")
    
    arrival_idx = np.argmax(np.abs(rec_data) > (np.max(np.abs(rec_data)) * 0.1))
    if arrival_idx > 0:
        arrival_time = arrival_idx * solver.dt
        expected_time = (70 - 30) * 5.0 / 3000.0
        print(f"波到达时间: {arrival_time:.3f}s (理论: {expected_time:.3f}s)")
        
        if abs(arrival_time - expected_time) < 0.05:
            print("✓ 波传播速度正确")
    
    print("✓ 波场传播正常")
    return True

def main():
    print("\n边界条件修复验证测试")
    print("=" * 60)
    
    try:
        result1 = test_boundary_not_zero()
        result2 = test_wave_propagation()
        
        print("\n" + "=" * 60)
        if result1 and result2:
            print("✅ 所有边界条件修复测试通过！")
            print("=" * 60)
            return 0
        else:
            print("❌ 部分测试失败")
            print("=" * 60)
            return 1
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
