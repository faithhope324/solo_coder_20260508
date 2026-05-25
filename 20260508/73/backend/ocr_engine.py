import numpy as np
from typing import List, Tuple, Dict, Any
import easyocr


class OCREngine:
    def __init__(self, use_angle_cls: bool = True, lang: str = "ch"):
        lang_list = ["ch_sim", "en"] if lang == "ch" else [lang, "en"]
        self.ocr = easyocr.Reader(
            lang_list,
            gpu=False,
            verbose=False
        )

    def detect_and_recognize(self, image: np.ndarray) -> List[Dict[str, Any]]:
        result = self.ocr.readtext(image, detail=1, paragraph=False)
        text_regions = []

        if result:
            for line in result:
                coords = line[0]
                text = line[1]
                confidence = line[2]

                x_coords = [p[0] for p in coords]
                y_coords = [p[1] for p in coords]
                x_min, x_max = min(x_coords), max(x_coords)
                y_min, y_max = min(y_coords), max(y_coords)

                text_regions.append({
                    "bbox": [x_min, y_min, x_max, y_max],
                    "polygon": coords,
                    "text": text,
                    "confidence": confidence,
                    "center_x": (x_min + x_max) / 2,
                    "center_y": (y_min + y_max) / 2,
                    "width": x_max - x_min,
                    "height": y_max - y_min
                })

        return text_regions
