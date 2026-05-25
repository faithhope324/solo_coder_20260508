"""
大气稳定度分类参数
根据Pasquill-Gifford扩散参数
"""

STABILITY_CLASSES = {
    "A": {
        "description": "极不稳定",
        "sigma_y_a": 213.0,
        "sigma_y_b": 0.894,
        "sigma_z_a": 440.8,
        "sigma_z_b": 0.516,
        "wind_condition": "日间强日照, 风速 < 2 m/s"
    },
    "B": {
        "description": "中等不稳定",
        "sigma_y_a": 156.0,
        "sigma_y_b": 0.894,
        "sigma_z_a": 106.6,
        "sigma_z_b": 0.721,
        "wind_condition": "日间中等日照, 风速 2-3 m/s"
    },
    "C": {
        "description": "弱不稳定",
        "sigma_y_a": 104.0,
        "sigma_y_b": 0.924,
        "sigma_z_a": 61.0,
        "sigma_z_b": 0.721,
        "wind_condition": "日间弱日照, 风速 3-5 m/s"
    },
    "D": {
        "description": "中性",
        "sigma_y_a": 68.0,
        "sigma_y_b": 0.924,
        "sigma_z_a": 33.5,
        "sigma_z_b": 0.721,
        "wind_condition": "阴天白天或夜间, 风速 > 5 m/s"
    },
    "E": {
        "description": "弱稳定",
        "sigma_y_a": 50.5,
        "sigma_y_b": 0.894,
        "sigma_z_a": 22.8,
        "sigma_z_b": 0.721,
        "wind_condition": "夜间弱风, 有云量 > 50%"
    },
    "F": {
        "description": "中等稳定",
        "sigma_y_a": 34.0,
        "sigma_y_b": 0.894,
        "sigma_z_a": 14.35,
        "sigma_z_b": 0.740,
        "wind_condition": "夜间静风, 云量 < 50%"
    }
}


def get_diffusion_params(stability_class: str, x: float) -> tuple[float, float]:
    """
    根据下风向距离x计算扩散参数σy和σz
    
    参数:
        stability_class: 稳定度分类 (A-F)
        x: 下风向距离 (m)
        
    返回:
        (σy, σz): 横向和垂直扩散参数 (m)
    """
    if stability_class not in STABILITY_CLASSES:
        raise ValueError(f"无效的稳定度分类: {stability_class}")
    
    params = STABILITY_CLASSES[stability_class]
    
    x_km = x / 1000.0
    
    if x_km < 0.1:
        x_km = 0.1
    
    sigma_y = params["sigma_y_a"] * (x_km ** params["sigma_y_b"])
    sigma_z = params["sigma_z_a"] * (x_km ** params["sigma_z_b"])
    
    return sigma_y, sigma_z
