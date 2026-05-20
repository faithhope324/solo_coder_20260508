import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
import os


class YOLODetector:
    def __init__(self, model_path: str = None, confidence_threshold: float = 0.5, nms_threshold: float = 0.4):
        self.confidence_threshold = confidence_threshold
        self.nms_threshold = nms_threshold
        self.model = None
        self.class_names = [
            'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus',
            'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
            'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
            'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
            'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
            'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat',
            'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
            'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
            'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
            'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
            'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
            'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
            'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
            'scissors', 'teddy bear', 'hair drier', 'toothbrush'
        ]
        self.class_colors = {}
        for i, name in enumerate(self.class_names):
            np.random.seed(i)
            self.class_colors[name] = (
                int(np.random.randint(0, 255)),
                int(np.random.randint(0, 255)),
                int(np.random.randint(0, 255))
            )
        
        self._load_model(model_path)
    
    def _load_model(self, model_path: str = None):
        try:
            import torch
            from pathlib import Path
            
            if model_path and os.path.exists(model_path):
                self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
            else:
                self.model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
            
            self.model.conf = self.confidence_threshold
            self.model.iou = self.nms_threshold
            self.use_torch = True
            print("YOLOv5 model loaded successfully with PyTorch")
        except Exception as e:
            print(f"PyTorch YOLOv5 not available, using OpenCV DNN fallback: {e}")
            self.use_torch = False
            self._load_opencv_model()
    
    def _load_opencv_model(self):
        try:
            weights_path = "yolov3.weights"
            config_path = "yolov3.cfg"
            
            if os.path.exists(weights_path) and os.path.exists(config_path):
                self.net = cv2.dnn.readNet(weights_path, config_path)
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                
                with open("coco.names", "r") as f:
                    self.class_names = [line.strip() for line in f.readlines()]
                
                self.use_opencv = True
                print("YOLOv3 model loaded successfully with OpenCV DNN")
            else:
                self.use_opencv = False
                print("OpenCV YOLOv3 weights not found, using simple background subtraction detection")
        except Exception as e:
            print(f"OpenCV DNN model loading failed: {e}")
            self.use_opencv = False
    
    def detect(self, frame: np.ndarray) -> List[Tuple[List[float], str, float]]:
        if self.model is not None and self.use_torch:
            return self._detect_torch(frame)
        elif hasattr(self, 'use_opencv') and self.use_opencv:
            return self._detect_opencv(frame)
        else:
            return self._detect_simple(frame)
    
    def _detect_torch(self, frame: np.ndarray) -> List[Tuple[List[float], str, float]]:
        results = self.model(frame)
        detections = []
        
        for det in results.xyxy[0]:
            x1, y1, x2, y2, conf, cls_id = det.cpu().numpy()
            class_name = self.model.names[int(cls_id)]
            detections.append(([float(x1), float(y1), float(x2), float(y2)], class_name, float(conf)))
        
        return detections
    
    def _detect_opencv(self, frame: np.ndarray) -> List[Tuple[List[float], str, float]]:
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (416, 416), swapRB=True, crop=False)
        self.net.setInput(blob)
        
        output_layers = self.net.getUnconnectedOutLayersNames()
        outputs = self.net.forward(output_layers)
        
        detections = []
        class_ids = []
        confidences = []
        boxes = []
        
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > self.confidence_threshold:
                    center_x = int(detection[0] * frame.shape[1])
                    center_y = int(detection[1] * frame.shape[0])
                    width = int(detection[2] * frame.shape[1])
                    height = int(detection[3] * frame.shape[0])
                    
                    x1 = int(center_x - width / 2)
                    y1 = int(center_y - height / 2)
                    x2 = x1 + width
                    y2 = y1 + height
                    
                    boxes.append([x1, y1, x2, y2])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        indices = cv2.dnn.NMSBoxes(boxes, confidences, self.confidence_threshold, self.nms_threshold)
        
        for i in indices:
            if isinstance(i, list):
                i = i[0]
            box = boxes[i]
            class_name = self.class_names[class_ids[i]] if class_ids[i] < len(self.class_names) else 'unknown'
            detections.append((box, class_name, confidences[i]))
        
        return detections
    
    def _detect_simple(self, frame: np.ndarray) -> List[Tuple[List[float], str, float]]:
        if not hasattr(self, 'fgbg'):
            self.fgbg = cv2.createBackgroundSubtractorMOG2(
                history=500,
                varThreshold=16,
                detectShadows=True
            )
        
        fgmask = self.fgbg.apply(frame)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel, iterations=2)
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        contours, _ = cv2.findContours(fgmask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        detections = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 500:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h > 0 else 1
                
                if 0.2 < aspect_ratio < 5:
                    if area > 5000:
                        class_name = 'car'
                    elif area > 2000:
                        class_name = 'person'
                    else:
                        class_name = 'object'
                    
                    detections.append(([float(x), float(y), float(x + w), float(y + h)], class_name, 0.7))
        
        return detections
    
    def get_class_color(self, class_name: str) -> Tuple[int, int, int]:
        return self.class_colors.get(class_name, (0, 255, 0))
