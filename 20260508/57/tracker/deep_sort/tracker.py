import numpy as np
from typing import List, Tuple, Dict, Any
from .track import Track
from .kalman_filter import KalmanFilter
from .matching import iou_cost, linear_assignment


class DeepSORTTracker:
    def __init__(self, max_age: int = 30, n_init: int = 3, iou_threshold: float = 0.5):
        self.max_age = max_age
        self.n_init = n_init
        self.iou_threshold = iou_threshold
        self.tracks: List[Track] = []
        self.next_id = 1
        self.kf: Dict[int, KalmanFilter] = {}
    
    def _initiate_track(self, bbox: List[float], class_name: str, confidence: float) -> Track:
        track = Track(
            track_id=self.next_id,
            bbox=bbox,
            class_name=class_name,
            confidence=confidence,
            max_age=self.max_age,
            n_init=self.n_init
        )
        kf = KalmanFilter()
        measurement = Track._bbox_to_measurement(bbox)
        kf.initiate(measurement)
        self.kf[self.next_id] = kf
        self.next_id += 1
        return track
    
    def update(self, detections: List[Tuple[List[float], str, float]]) -> List[Track]:
        for track in self.tracks:
            if track.track_id in self.kf:
                track.predict(self.kf[track.track_id])
        
        confirmed_tracks = [t for t in self.tracks if t.is_confirmed()]
        unconfirmed_tracks = [t for t in self.tracks if not t.is_confirmed()]
        
        matches_a, unmatched_tracks_a, unmatched_detections = self._match(confirmed_tracks, detections)
        
        iou_track_candidates = unconfirmed_tracks + [self.tracks[i] for i in unmatched_tracks_a if self.tracks[i].time_since_update == 1]
        unmatched_tracks_a = [i for i in unmatched_tracks_a if self.tracks[i].time_since_update != 1]
        
        unmatched_detections_for_iou = list(unmatched_detections)
        if len(iou_track_candidates) > 0 and len(unmatched_detections_for_iou) > 0:
            detections_for_iou = [detections[i] for i in unmatched_detections_for_iou]
            cost_matrix = iou_cost(iou_track_candidates, detections_for_iou)
            matches_b, unmatched_tracks_b, unmatched_detections_b = linear_assignment(cost_matrix, self.iou_threshold)
            
            for track_idx, det_idx in matches_b:
                original_track_idx = self.tracks.index(iou_track_candidates[track_idx])
                original_det_idx = unmatched_detections_for_iou[det_idx]
                matches_a = np.vstack([matches_a, [original_track_idx, original_det_idx]]) if len(matches_a) > 0 else np.array([[original_track_idx, original_det_idx]])
            
            unmatched_tracks = list(unmatched_tracks_a) + [self.tracks.index(iou_track_candidates[i]) for i in unmatched_tracks_b]
            unmatched_detections = [unmatched_detections_for_iou[i] for i in unmatched_detections_b]
        else:
            unmatched_tracks = list(unmatched_tracks_a)
        
        for track_idx, det_idx in matches_a:
            track = self.tracks[track_idx]
            detection = detections[det_idx]
            if track.track_id in self.kf:
                track.update(self.kf[track.track_id], detection)
        
        for track_idx in unmatched_tracks:
            self.tracks[track_idx].mark_missed()
        
        for det_idx in unmatched_detections:
            bbox, class_name, confidence = detections[det_idx]
            new_track = self._initiate_track(bbox, class_name, confidence)
            self.tracks.append(new_track)
        
        self.tracks = [t for t in self.tracks if t.state != "deleted"]
        
        for track in self.tracks:
            if not track.is_confirmed() and track.time_since_update > self.n_init:
                track.state = "deleted"
        
        self.tracks = [t for t in self.tracks if t.state != "deleted"]
        
        return self.tracks
    
    def _match(self, tracks: List[Track], detections: List[Tuple[List[float], str, float]]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if len(tracks) == 0 or len(detections) == 0:
            return np.empty((0, 2), dtype=int), np.arange(len(tracks), dtype=int), np.arange(len(detections), dtype=int)
        
        cost_matrix = iou_cost(tracks, detections)
        matches, unmatched_tracks, unmatched_detections = linear_assignment(cost_matrix, self.iou_threshold)
        
        return matches, unmatched_tracks, unmatched_detections
    
    def get_confirmed_tracks(self) -> List[Track]:
        return [t for t in self.tracks if t.is_confirmed()]
    
    def get_all_tracks(self) -> List[Track]:
        return self.tracks
