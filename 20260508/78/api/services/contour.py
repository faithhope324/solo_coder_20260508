"""
等值线生成服务
"""

import numpy as np
from typing import Dict, Any, List, Tuple
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.contour import ContourSet


class ContourGenerator:
    """等值线生成器"""
    
    def __init__(self):
        self.default_levels = [0.1, 0.5, 1, 5, 10, 25, 50, 100, 250, 500]
    
    def generate_contours(
        self, 
        X: np.ndarray, 
        Y: np.ndarray, 
        C: np.ndarray,
        levels: List[float] = None
    ) -> Dict[str, Any]:
        """
        生成等值线数据
        
        参数:
            X: x坐标网格
            Y: y坐标网格
            C: 浓度网格
            levels: 等值线级别列表
            
        返回:
            等值线数据，包含级别和SVG路径
        """
        if levels is None:
            max_c = np.max(C)
            if max_c > 0:
                levels = self._generate_log_levels(max_c)
            else:
                levels = self.default_levels
        
        fig, ax = plt.subplots()
        cs = ax.contour(X, Y, C, levels=levels)
        
        contour_paths = []
        for i, level in enumerate(levels):
            paths = []
            segs = cs.allsegs[i] if i < len(cs.allsegs) else []
            for seg in segs:
                if len(seg) > 1:
                    svg_path = self._vertices_to_svg(seg)
                    if svg_path:
                        paths.append(svg_path)
            contour_paths.append(paths)
        
        plt.close(fig)
        
        return {
            "levels": [float(l) for l in levels],
            "paths": contour_paths,
            "bounds": {
                "xMin": float(np.min(X)),
                "xMax": float(np.max(X)),
                "yMin": float(np.min(Y)),
                "yMax": float(np.max(Y))
            }
        }
    
    def _generate_log_levels(self, max_value: float) -> List[float]:
        """生成对数间隔的等值线级别"""
        if max_value <= 0:
            return self.default_levels
        
        min_level = max(0.01, max_value / 1000)
        levels = []
        current = min_level
        while current <= max_value * 1.1:
            levels.append(round(current, 4))
            if current < 1:
                current *= 2
            elif current < 10:
                current *= 2.5
            elif current < 100:
                current *= 2
            else:
                current *= 2.5
        
        return levels[:15]
    
    def _path_to_svg(self, path) -> str:
        """将matplotlib路径转换为SVG路径字符串"""
        if len(path.vertices) == 0:
            return ""
        
        vertices = path.vertices
        codes = path.codes
        
        svg_parts = []
        
        if codes is None:
            svg_parts.append(f"M{vertices[0, 0]:.2f},{vertices[0, 1]:.2f}")
            for i in range(1, len(vertices)):
                svg_parts.append(f"L{vertices[i, 0]:.2f},{vertices[i, 1]:.2f}")
        else:
            import matplotlib.path as mpath
            for i, (code, vertex) in enumerate(zip(codes, vertices)):
                if code == mpath.Path.MOVETO:
                    svg_parts.append(f"M{vertex[0]:.2f},{vertex[1]:.2f}")
                elif code == mpath.Path.LINETO:
                    svg_parts.append(f"L{vertex[0]:.2f},{vertex[1]:.2f}")
                elif code == mpath.Path.CLOSEPOLY:
                    svg_parts.append("Z")
        
        return " ".join(svg_parts)
    
    def _vertices_to_svg(self, vertices: np.ndarray) -> str:
        """将顶点数组转换为SVG路径字符串"""
        if len(vertices) < 2:
            return ""
        
        svg_parts = [f"M{vertices[0, 0]:.2f},{vertices[0, 1]:.2f}"]
        for i in range(1, len(vertices)):
            svg_parts.append(f"L{vertices[i, 0]:.2f},{vertices[i, 1]:.2f}")
        
        return " ".join(svg_parts)
    
    def generate_heatmap_data(
        self, 
        grid_data: List[List[Dict[str, float]]]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """从网格数据生成热力图数据"""
        ny = len(grid_data)
        nx = len(grid_data[0]) if ny > 0 else 0
        
        X = np.zeros((ny, nx))
        Y = np.zeros((ny, nx))
        C = np.zeros((ny, nx))
        
        for i in range(ny):
            for j in range(nx):
                point = grid_data[i][j]
                X[i, j] = point["x"]
                Y[i, j] = point["y"]
                C[i, j] = point["concentration"]
        
        return X, Y, C
