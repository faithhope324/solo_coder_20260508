import numpy as np
from typing import List, Tuple, Dict, Any, Optional


class LineCounter:
    def __init__(
        self,
        line_start: Tuple[float, float] = (0.5, 0.0),
        line_end: Tuple[float, float] = (0.5, 1.0),
        target_classes: Optional[List[str]] = None
    ):
        self.line_start = np.array(line_start, dtype=np.float32)
        self.line_end = np.array(line_end, dtype=np.float32)
        self.target_classes = target_classes or ['person', 'car', 'truck', 'bicycle', 'motorcycle', 'bus']
        
        self.counts: Dict[str, Dict[str, int]] = {}
        self.previous_positions: Dict[int, np.ndarray] = {}
        self.crossed_tracks: set = set()
        
        for cls in self.target_classes:
            self.counts[cls] = {'in': 0, 'out': 0, 'total': 0}
    
    def reset(self):
        for cls in self.target_classes:
            self.counts[cls] = {'in': 0, 'out': 0, 'total': 0}
        self.previous_positions.clear()
        self.crossed_tracks.clear()
    
    def _get_line_equation(self):
        x1, y1 = self.line_start
        x2, y2 = self.line_end
        a = y2 - y1
        b = x1 - x2
        c = x2 * y1 - x1 * y2
        return a, b, c
    
    def _get_side(self, point: np.ndarray) -> float:
        a, b, c = self._get_line_equation()
        return a * point[0] + b * point[1] + c
    
    def _has_crossed(self, prev_pos: np.ndarray, curr_pos: np.ndarray) -> Optional[str]:
        prev_side = self._get_side(prev_pos)
        curr_side = self._get_side(curr_pos)
        
        if prev_side * curr_side < 0:
            line_vec = self.line_end - self.line_start
            point_vec = curr_pos - self.line_start
            cross = np.cross(line_vec, point_vec)
            
            if cross > 0:
                return 'in'
            else:
                return 'out'
        
        return None
    
    def update(self, tracks: List[Any], frame_width: int, frame_height: int) -> Dict[str, Dict[str, int]]:
        line_start_px = self.line_start * np.array([frame_width, frame_height])
        line_end_px = self.line_end * np.array([frame_width, frame_height])
        
        for track in tracks:
            if not track.is_confirmed():
                continue
            
            track_id = track.track_id
            class_name = track.class_name
            
            if class_name not in self.target_classes:
                continue
            
            bbox = track.bbox
            center = np.array([
                (bbox[0] + bbox[2]) / 2,
                (bbox[1] + bbox[3]) / 2
            ])
            
            if track_id in self.previous_positions:
                prev_pos = self.previous_positions[track_id]
                direction = self._has_crossed(prev_pos, center)
                
                if direction is not None and track_id not in self.crossed_tracks:
                    self.counts[class_name][direction] += 1
                    self.counts[class_name]['total'] += 1
                    self.crossed_tracks.add(track_id)
            
            self.previous_positions[track_id] = center
        
        return self.counts
    
    def get_counts(self) -> Dict[str, Dict[str, int]]:
        return self.counts
    
    def get_total_counts(self) -> Dict[str, int]:
        total = {'in': 0, 'out': 0, 'total': 0}
        for cls in self.counts:
            total['in'] += self.counts[cls]['in']
            total['out'] += self.counts[cls]['out']
            total['total'] += self.counts[cls]['total']
        return total
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'line_start': self.line_start.tolist(),
            'line_end': self.line_end.tolist(),
            'target_classes': self.target_classes,
            'counts': self.counts,
            'total': self.get_total_counts()
        }
