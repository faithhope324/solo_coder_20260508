import numpy as np


class Track:
    def __init__(self, track_id, bbox, class_name, confidence, max_age=30, n_init=3):
        self.track_id = track_id
        self.bbox = bbox
        self.class_name = class_name
        self.confidence = confidence
        self.max_age = max_age
        self.n_init = n_init
        self.hits = 1
        self.age = 0
        self.time_since_update = 0
        self.state = "tentative"
        self.trajectory = [self._get_center(bbox)]
        self.features = []
        self.history = []
    
    @staticmethod
    def _get_center(bbox):
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2, (y1 + y2) / 2)
    
    def predict(self, kf):
        if self.time_since_update > 0:
            self.hits = 0
        self.time_since_update += 1
        self.age += 1
        
        mean, cov = kf.predict()
        self.bbox = self._mean_to_bbox(mean)
        
        if self.state == "tentative" and self.time_since_update > self.n_init:
            self.state = "deleted"
    
    def update(self, kf, detection):
        bbox, class_name, confidence = detection
        self.bbox = bbox
        self.class_name = class_name
        self.confidence = confidence
        self.hits += 1
        self.time_since_update = 0
        
        measurement = self._bbox_to_measurement(bbox)
        kf.update(measurement)
        
        self.trajectory.append(self._get_center(bbox))
        if len(self.trajectory) > 100:
            self.trajectory = self.trajectory[-100:]
        
        self.history.append({
            'bbox': list(bbox),
            'class_name': class_name,
            'confidence': confidence
        })
        
        if self.state == "tentative" and self.hits >= self.n_init:
            self.state = "confirmed"
    
    @staticmethod
    def _bbox_to_measurement(bbox):
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        w = x2 - x1
        h = y2 - y1
        return np.array([cx, cy, w, h])
    
    @staticmethod
    def _mean_to_bbox(mean):
        cx, cy, w, h = mean
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2
        return [x1, y1, x2, y2]
    
    def is_confirmed(self):
        return self.state == "confirmed"
    
    def is_deleted(self):
        return self.time_since_update > self.max_age
    
    def mark_missed(self):
        self.time_since_update += 1
        if self.state == "tentative" and self.time_since_update > self.n_init:
            self.state = "deleted"
        elif self.time_since_update > self.max_age:
            self.state = "deleted"
