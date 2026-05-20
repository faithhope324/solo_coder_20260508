import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional, Callable
import time
import asyncio
from pathlib import Path

from .yolo_detector import YOLODetector
from .deep_sort import DeepSORTTracker
from .counter import LineCounter


class VideoProcessor:
    def __init__(
        self,
        video_path: str,
        line_counter: LineCounter,
        confidence_threshold: float = 0.5,
        frame_interval: int = 1,
        task_id: str = ""
    ):
        self.video_path = video_path
        self.line_counter = line_counter
        self.confidence_threshold = confidence_threshold
        self.frame_interval = frame_interval
        self.task_id = task_id
        
        self.detector = YOLODetector(confidence_threshold=confidence_threshold)
        self.tracker = DeepSORTTracker(max_age=30, n_init=3, iou_threshold=0.5)
        
        self.cap = None
        self.frame_width = 0
        self.frame_height = 0
        self.fps = 0
        self.total_frames = 0
        self.duration = 0
        
        self.frame_data: List[Dict[str, Any]] = []
        self.track_data: Dict[int, Dict[str, Any]] = {}
        
    async def process_video(self, progress_callback: Optional[Callable[[int, int, int], None]] = None) -> Dict[str, Any]:
        self.cap = cv2.VideoCapture(self.video_path)
        
        if self.cap.isOpened():
            self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.fps = self.cap.get(cv2.CAP_PROP_FPS)
            self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.duration = self.total_frames / self.fps if self.fps > 0 else 0
        
        start_time = time.time()
        frame_count = 0
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            if frame_count % self.frame_interval == 0:
                detections = self.detector.detect(frame)
                
                filtered_detections = []
                for bbox, class_name, confidence in detections:
                    if class_name in self.line_counter.target_classes:
                        filtered_detections.append((bbox, class_name, confidence))
                
                tracks = self.tracker.update(filtered_detections)
                
                self.line_counter.update(tracks, self.frame_width, self.frame_height)
                
                frame_detections = []
                for track in tracks:
                    if track.is_confirmed():
                        track_id = track.track_id
                        bbox = track.bbox
                        class_name = track.class_name
                        confidence = track.confidence
                        
                        frame_detections.append({
                            'track_id': track_id,
                            'bbox': [float(x) for x in bbox],
                            'class_name': class_name,
                            'confidence': float(confidence),
                            'trajectory': [[float(p[0]), float(p[1])] for p in track.trajectory[-10:]]
                        })
                        
                        if track_id not in self.track_data:
                            self.track_data[track_id] = {
                                'track_id': track_id,
                                'class_name': class_name,
                                'start_frame': frame_count,
                                'end_frame': frame_count,
                                'trajectory': [],
                                'bbox_history': []
                            }
                        
                        self.track_data[track_id]['end_frame'] = frame_count
                        center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
                        self.track_data[track_id]['trajectory'].append([float(center[0]), float(center[1])])
                        self.track_data[track_id]['bbox_history'].append([float(x) for x in bbox])
                
                self.frame_data.append({
                    'frame_number': frame_count,
                    'timestamp': frame_count / self.fps if self.fps > 0 else 0,
                    'detections': frame_detections
                })
            
            frame_count += 1
            
            if progress_callback and frame_count % 30 == 0:
                progress = int((frame_count / self.total_frames * 100) if self.total_frames > 0 else 0)
                progress_callback(progress, frame_count, self.total_frames)
        
        self.cap.release()
        
        processing_time = time.time() - start_time
        
        results = {
            'task_id': self.task_id,
            'video_path': self.video_path,
            'video_info': {
                'width': self.frame_width,
                'height': self.frame_height,
                'fps': self.fps,
                'total_frames': self.total_frames,
                'duration': self.duration
            },
            'processing_info': {
                'processing_time': processing_time,
                'frames_processed': len(self.frame_data),
                'frame_interval': self.frame_interval
            },
            'line_counter': self.line_counter.to_dict(),
            'counts': self.line_counter.get_counts(),
            'total_counts': self.line_counter.get_total_counts(),
            'frames': self.frame_data,
            'tracks': {str(k): v for k, v in self.track_data.items()},
            'total_tracks': len(self.track_data)
        }
        
        return results
    
    def get_frame_data(self) -> List[Dict[str, Any]]:
        return self.frame_data
    
    def get_track_data(self) -> Dict[int, Dict[str, Any]]:
        return self.track_data
    
    def get_counts(self) -> Dict[str, Dict[str, int]]:
        return self.line_counter.get_counts()
    
    def get_processing_stats(self) -> Dict[str, Any]:
        return {
            'total_frames': self.total_frames,
            'fps': self.fps,
            'duration': self.duration,
            'width': self.frame_width,
            'height': self.frame_height
        }
