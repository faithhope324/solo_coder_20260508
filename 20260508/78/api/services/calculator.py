"""
浓度计算服务
"""

import time
import numpy as np
from typing import Dict, Any, List, Tuple
from models.gaussian import (
    calculate_plume_rise,
    calculate_wind_speed_at_height,
    calculate_concentration_grid,
    calculate_plume_centerline
)


class DiffusionCalculator:
    """大气扩散计算器"""
    
    def __init__(self):
        pass
    
    def process_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理输入参数"""
        source = params["source"]
        meteorology = params["meteorology"]
        domain = params["domain"]
        
        stack_height = source["stackHeight"]
        wind_speed_ref = meteorology["windSpeed"]
        stability_class = meteorology["stabilityClass"]
        
        u_stack = calculate_wind_speed_at_height(
            wind_speed_ref, 10, stack_height, stability_class
        )
        
        delta_h = calculate_plume_rise(
            vs=source["exitVelocity"],
            d=source["stackRadius"] * 2,
            u=u_stack,
            Ts=source["exitTemperature"],
            Ta=meteorology["ambientTemperature"]
        )
        
        effective_height = stack_height + delta_h
        
        return {
            "Q": source["emissionRate"],
            "u": u_stack,
            "H": effective_height,
            "wind_direction": meteorology["windDirection"],
            "stability_class": stability_class,
            "grid_size": domain["gridSize"],
            "domain_width": domain["domainWidth"],
            "downwind_distance": domain["downwindDistance"],
            "mixing_height": meteorology["mixingHeight"],
            "source_lon": source["longitude"],
            "source_lat": source["latitude"],
            "plume_rise": delta_h,
            "effective_height": effective_height
        }
    
    def calculate(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """执行计算"""
        start_time = time.time()
        
        processed = self.process_params(params)
        
        X, Y, C = calculate_concentration_grid(
            Q=processed["Q"],
            u=processed["u"],
            H=processed["H"],
            wind_direction=processed["wind_direction"],
            stability_class=processed["stability_class"],
            grid_size=processed["grid_size"],
            domain_width=processed["domain_width"],
            downwind_distance=processed["downwind_distance"],
            mixing_height=processed["mixing_height"]
        )
        
        distances, plume_concentrations = calculate_plume_centerline(
            Q=processed["Q"],
            u=processed["u"],
            H=processed["H"],
            stability_class=processed["stability_class"],
            max_distance=processed["downwind_distance"],
            num_points=100,
            mixing_height=processed["mixing_height"]
        )
        
        grid_data = self._format_grid_data(X, Y, C, processed)
        plume_line = self._format_plume_line(distances, plume_concentrations)
        
        max_idx = np.unravel_index(np.argmax(C), C.shape)
        max_concentration = float(C[max_idx])
        max_x = float(X[max_idx])
        max_y = float(Y[max_idx])
        
        max_lon, max_lat = self._xy_to_latlon(
            max_x, max_y, 
            processed["source_lon"], 
            processed["source_lat"],
            processed["wind_direction"]
        )
        
        computation_time = time.time() - start_time
        
        return {
            "grid": grid_data,
            "maxConcentration": max_concentration,
            "maxConcentrationPoint": {"lon": max_lon, "lat": max_lat},
            "plumeLine": plume_line,
            "effectiveHeight": processed["effective_height"],
            "plumeRise": processed["plume_rise"],
            "statistics": {
                "computationTime": computation_time,
                "gridPoints": int(X.shape[0] * X.shape[1])
            }
        }
    
    def _format_grid_data(
        self, 
        X: np.ndarray, 
        Y: np.ndarray, 
        C: np.ndarray,
        processed: Dict[str, Any]
    ) -> List[List[Dict[str, float]]]:
        """格式化网格数据"""
        ny, nx = X.shape
        source_lon = processed["source_lon"]
        source_lat = processed["source_lat"]
        wind_direction = processed["wind_direction"]
        
        grid = []
        for i in range(ny):
            row = []
            for j in range(nx):
                x = float(X[i, j])
                y = float(Y[i, j])
                lon, lat = self._xy_to_latlon(x, y, source_lon, source_lat, wind_direction)
                row.append({
                    "x": x,
                    "y": y,
                    "lon": lon,
                    "lat": lat,
                    "concentration": float(C[i, j])
                })
            grid.append(row)
        
        return grid
    
    def _xy_to_latlon(
        self, 
        x: float, 
        y: float, 
        source_lon: float, 
        source_lat: float,
        wind_direction: float
    ) -> Tuple[float, float]:
        """
        将相对坐标转换为经纬度
        使用简化的等距投影转换
        """
        meters_per_degree_lat = 111319.9
        meters_per_degree_lon = 111319.9 * np.cos(np.radians(source_lat))
        
        wind_rad = np.radians(270 - wind_direction)
        cos_theta = np.cos(wind_rad)
        sin_theta = np.sin(wind_rad)
        
        x_world = x * cos_theta - y * sin_theta
        y_world = x * sin_theta + y * cos_theta
        
        delta_lon = y_world / meters_per_degree_lon
        delta_lat = x_world / meters_per_degree_lat
        
        lon = source_lon + delta_lon
        lat = source_lat + delta_lat
        
        return lon, lat
    
    def _format_plume_line(
        self, 
        distances: np.ndarray, 
        concentrations: np.ndarray
    ) -> List[Dict[str, float]]:
        """格式化下风向轴线数据"""
        plume_line = []
        for d, c in zip(distances, concentrations):
            plume_line.append({
                "distance": float(d),
                "concentration": float(c)
            })
        return plume_line
