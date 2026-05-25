"""
高斯烟羽模型核心计算模块
"""

import numpy as np
from typing import Tuple
from .stability import get_diffusion_params


def calculate_plume_rise(
    vs: float,
    d: float,
    u: float,
    Ts: float,
    Ta: float,
    P: float = 101.3
) -> float:
    """
    计算烟气抬升高度 (霍兰德公式)
    
    参数:
        vs: 烟气出口速度 (m/s)
        d: 烟囱出口直径 (m)
        u: 烟囱口处风速 (m/s)
        Ts: 烟气出口温度 (K)
        Ta: 环境温度 (K)
        P: 大气压力 (kPa), 默认101.3 kPa
        
    返回:
        Δh: 烟气抬升高度 (m)
    """
    if u < 0.5:
        u = 0.5
    
    delta_T = Ts - Ta
    
    if delta_T <= 0:
        return 0.0
    
    delta_h = (vs * d / u) * (1.5 + 2.68e-3 * P * d * delta_T / Ts)
    
    return delta_h


def calculate_wind_speed_at_height(u_ref: float, z_ref: float, z: float, stability_class: str) -> float:
    """
    风速廓线 - 幂指数公式
    
    参数:
        u_ref: 参考高度处风速 (m/s)
        z_ref: 参考高度 (m)
        z: 计算高度 (m)
        stability_class: 稳定度分类
        
    返回:
        u_z: 高度z处的风速 (m/s)
    """
    p_values = {
        "A": 0.1,
        "B": 0.15,
        "C": 0.20,
        "D": 0.25,
        "E": 0.30,
        "F": 0.35
    }
    
    p = p_values.get(stability_class, 0.25)
    
    if z_ref <= 0 or z <= 0:
        return u_ref
    
    u_z = u_ref * (z / z_ref) ** p
    
    return u_z


def calculate_concentration(
    Q: float,
    u: float,
    H: float,
    x: float,
    y: float,
    z: float,
    stability_class: str,
    mixing_height: float = 1000.0
) -> float:
    """
    计算指定位置的污染物浓度
    
    参数:
        Q: 排放速率 (g/s)
        u: 烟囱出口处平均风速 (m/s)
        H: 有效源高 (m)
        x: 下风向距离 (m)
        y: 横风向距离 (m)
        z: 离地高度 (m)
        stability_class: 稳定度分类 (A-F)
        mixing_height: 混合层高度 (m)
        
    返回:
        C: 浓度 (μg/m³)
    """
    if x <= 0:
        return 0.0
    
    sigma_y, sigma_z = get_diffusion_params(stability_class, x)
    
    if sigma_y <= 0 or sigma_z <= 0:
        return 0.0
    
    exponent_y = np.exp(-y**2 / (2 * sigma_y**2))
    
    exponent_z1 = np.exp(-(z - H)**2 / (2 * sigma_z**2))
    exponent_z2 = np.exp(-(z + H)**2 / (2 * sigma_z**2))
    
    C = (Q / (2 * np.pi * u * sigma_y * sigma_z)) * exponent_y * (exponent_z1 + exponent_z2)
    
    if mixing_height > 0 and H < mixing_height:
        n_terms = 3
        for n in range(1, n_terms + 1):
            exponent_z3 = np.exp(-(z - H - 2 * n * mixing_height)**2 / (2 * sigma_z**2))
            exponent_z4 = np.exp(-(z + H + 2 * n * mixing_height)**2 / (2 * sigma_z**2))
            exponent_z5 = np.exp(-(z - H + 2 * n * mixing_height)**2 / (2 * sigma_z**2))
            exponent_z6 = np.exp(-(z + H - 2 * n * mixing_height)**2 / (2 * sigma_z**2))
            C += (Q / (2 * np.pi * u * sigma_y * sigma_z)) * exponent_y * (exponent_z3 + exponent_z4 + exponent_z5 + exponent_z6)
    
    C_ugm3 = C * 1e6
    
    return C_ugm3


def calculate_ground_level_concentration(
    Q: float,
    u: float,
    H: float,
    x: float,
    y: float,
    stability_class: str,
    mixing_height: float = 1000.0
) -> float:
    """
    计算地面浓度 (z=0)
    
    参数:
        Q: 排放速率 (g/s)
        u: 烟囱出口处平均风速 (m/s)
        H: 有效源高 (m)
        x: 下风向距离 (m)
        y: 横风向距离 (m)
        stability_class: 稳定度分类 (A-F)
        mixing_height: 混合层高度 (m)
        
    返回:
        C: 地面浓度 (μg/m³)
    """
    return calculate_concentration(Q, u, H, x, y, 0, stability_class, mixing_height)


def calculate_concentration_grid(
    Q: float,
    u: float,
    H: float,
    wind_direction: float,
    stability_class: str,
    grid_size: float,
    domain_width: float,
    downwind_distance: float,
    mixing_height: float = 1000.0
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    计算浓度网格
    
    参数:
        Q: 排放速率 (g/s)
        u: 烟囱出口处平均风速 (m/s)
        H: 有效源高 (m)
        wind_direction: 风向 (度, 0=北, 顺时针)
        stability_class: 稳定度分类 (A-F)
        grid_size: 网格分辨率 (m)
        domain_width: 计算域宽度 (m)
        downwind_distance: 下风向最大距离 (m)
        mixing_height: 混合层高度 (m)
        
    返回:
        (X_grid, Y_grid, C_grid): x坐标网格, y坐标网格, 浓度网格 (μg/m³)
    """
    wind_rad = np.radians(270 - wind_direction)
    
    nx = int(downwind_distance / grid_size) + 1
    ny = int(domain_width / grid_size) + 1
    
    x_coords = np.linspace(0, downwind_distance, nx)
    y_coords = np.linspace(-domain_width/2, domain_width/2, ny)
    
    X, Y = np.meshgrid(x_coords, y_coords)
    
    cos_theta = np.cos(wind_rad)
    sin_theta = np.sin(wind_rad)
    
    X_rot = X * cos_theta - Y * sin_theta
    Y_rot = X * sin_theta + Y * cos_theta
    
    C = np.zeros(X.shape)
    
    for i in range(X.shape[0]):
        for j in range(X.shape[1]):
            x_rot = X_rot[i, j]
            y_rot = Y_rot[i, j]
            if x_rot > 0:
                C[i, j] = calculate_ground_level_concentration(
                    Q, u, H, x_rot, y_rot, stability_class, mixing_height
                )
    
    return X, Y, C


def calculate_plume_centerline(
    Q: float,
    u: float,
    H: float,
    stability_class: str,
    max_distance: float,
    num_points: int = 100,
    mixing_height: float = 1000.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    计算下风向轴线浓度分布 (y=0, z=0)
    
    参数:
        Q: 排放速率 (g/s)
        u: 烟囱出口处平均风速 (m/s)
        H: 有效源高 (m)
        stability_class: 稳定度分类 (A-F)
        max_distance: 最大计算距离 (m)
        num_points: 采样点数
        mixing_height: 混合层高度 (m)
        
    返回:
        (distances, concentrations): 距离数组, 浓度数组 (μg/m³)
    """
    distances = np.linspace(10, max_distance, num_points)
    concentrations = np.zeros_like(distances)
    
    for i, x in enumerate(distances):
        concentrations[i] = calculate_ground_level_concentration(
            Q, u, H, x, 0, stability_class, mixing_height
        )
    
    return distances, concentrations
