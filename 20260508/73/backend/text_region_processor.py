import numpy as np
from typing import List, Dict, Any, Tuple
from collections import defaultdict


class TextRegionProcessor:
    @staticmethod
    def calculate_iou(box1: List[float], box2: List[float]) -> float:
        x1_min, y1_min, x1_max, y1_max = box1
        x2_min, y2_min, x2_max, y2_max = box2

        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)

        if inter_x_max <= inter_x_min or inter_y_max <= inter_y_min:
            return 0.0

        inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)
        area1 = (x1_max - x1_min) * (y1_max - y1_min)
        area2 = (x2_max - x2_min) * (y2_max - y2_min)
        union_area = area1 + area2 - inter_area

        return inter_area / union_area if union_area > 0 else 0.0

    @staticmethod
    def merge_overlapping_regions(
        regions: List[Dict[str, Any]],
        iou_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        if not regions:
            return []

        regions = sorted(regions, key=lambda r: r["confidence"], reverse=True)
        merged = []
        skip_indices = set()

        for i, region in enumerate(regions):
            if i in skip_indices:
                continue

            current_box = region["bbox"]
            current_polygon = region["polygon"]
            merged_text = region["text"]
            merged_confidence = region["confidence"]
            count = 1

            for j in range(i + 1, len(regions)):
                if j in skip_indices:
                    continue

                other_region = regions[j]
                other_box = other_region["bbox"]
                iou = TextRegionProcessor.calculate_iou(current_box, other_box)

                if iou > iou_threshold:
                    skip_indices.add(j)
                    x_coords = [p[0] for p in other_region["polygon"]] + [p[0] for p in current_polygon]
                    y_coords = [p[1] for p in other_region["polygon"]] + [p[1] for p in current_polygon]
                    x_min, x_max = min(x_coords), max(x_coords)
                    y_min, y_max = min(y_coords), max(y_coords)
                    current_box = [x_min, y_min, x_max, y_max]
                    current_polygon = [
                        [x_min, y_min], [x_max, y_min], [x_max, y_max], [x_min, y_max]
                    ]
                    if len(other_region["text"]) > len(merged_text):
                        merged_text = other_region["text"]
                    merged_confidence = max(merged_confidence, other_region["confidence"])
                    count += 1

            x_min, y_min, x_max, y_max = current_box
            merged.append({
                "bbox": current_box,
                "polygon": current_polygon,
                "text": merged_text,
                "confidence": merged_confidence,
                "center_x": (x_min + x_max) / 2,
                "center_y": (y_min + y_max) / 2,
                "width": x_max - x_min,
                "height": y_max - y_min,
                "merged_count": count
            })

        return merged

    @staticmethod
    def sort_text_regions(
        regions: List[Dict[str, Any]],
        image_height: int
    ) -> List[Dict[str, Any]]:
        if not regions:
            return []

        line_height_threshold = image_height * 0.05
        sorted_regions = sorted(regions, key=lambda r: r["center_y"])

        lines = []
        current_line = [sorted_regions[0]]
        current_line_y = sorted_regions[0]["center_y"]

        for region in sorted_regions[1:]:
            if abs(region["center_y"] - current_line_y) < line_height_threshold:
                current_line.append(region)
            else:
                lines.append(current_line)
                current_line = [region]
                current_line_y = region["center_y"]

        if current_line:
            lines.append(current_line)

        final_sorted = []
        for line in lines:
            line_sorted = sorted(line, key=lambda r: r["center_x"])
            final_sorted.extend(line_sorted)

        return final_sorted

    @staticmethod
    def process_regions(
        regions: List[Dict[str, Any]],
        image_height: int,
        iou_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        merged = TextRegionProcessor.merge_overlapping_regions(regions, iou_threshold)
        sorted_regions = TextRegionProcessor.sort_text_regions(merged, image_height)
        return sorted_regions
