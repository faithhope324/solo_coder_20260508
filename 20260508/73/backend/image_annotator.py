import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Tuple
import os


class ImageAnnotator:
    def __init__(self):
        self.font_path = self._get_font_path()
        self.colors = [
            (255, 0, 0), (0, 255, 0), (0, 0, 255),
            (255, 255, 0), (255, 0, 255), (0, 255, 255),
            (255, 128, 0), (128, 0, 255), (0, 255, 128),
            (255, 0, 128), (128, 255, 0), (0, 128, 255)
        ]

    def _get_font_path(self) -> str:
        possible_paths = [
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/msyh.ttf",
            "C:/Windows/Fonts/simhei.ttf",
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/System/Library/Fonts/PingFang.ttc",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        return ""

    def _get_font_size(self, region_height: float, text_length: int, region_width: float) -> int:
        base_size = max(12, int(region_height * 0.6))
        max_size_by_width = max(8, int(region_width / (text_length * 0.6)))
        return min(base_size, max_size_by_width, 48)

    def _get_translation_position(
        self,
        region: Dict[str, Any],
        image_shape: Tuple[int, int],
        translated_text: str,
        font_size: int
    ) -> Tuple[int, int, str]:
        h, w = image_shape
        x_min, y_min, x_max, y_max = region["bbox"]
        region_width = x_max - x_min
        region_height = y_max - y_min

        text_width = len(translated_text) * font_size * 0.6
        text_height = font_size * 1.2

        right_space = w - x_max
        left_space = x_min
        bottom_space = h - y_max
        top_space = y_min

        if right_space > text_width + 20:
            x = int(x_max + 10)
            y = int((y_min + y_max) / 2 - text_height / 2)
            position = "right"
        elif left_space > text_width + 20:
            x = int(x_min - text_width - 10)
            y = int((y_min + y_max) / 2 - text_height / 2)
            position = "left"
        elif bottom_space > text_height + 20:
            x = int((x_min + x_max) / 2 - text_width / 2)
            y = int(y_max + 10)
            position = "bottom"
        elif top_space > text_height + 20:
            x = int((x_min + x_max) / 2 - text_width / 2)
            y = int(y_min - text_height - 10)
            position = "top"
        else:
            x = int(x_min + 5)
            y = int(y_min + 5)
            position = "overlay"

        x = max(0, min(x, w - int(text_width)))
        y = max(0, min(y, h - int(text_height)))

        return x, y, position

    def annotate_image(
        self,
        image: np.ndarray,
        text_regions: List[Dict[str, Any]],
        translations: List[str],
        draw_bboxes: bool = True,
        draw_translations: bool = True
    ) -> np.ndarray:
        annotated = image.copy()
        h, w = annotated.shape[:2]

        for idx, (region, translated_text) in enumerate(zip(text_regions, translations)):
            color = self.colors[idx % len(self.colors)]
            bgr_color = (color[2], color[1], color[0])

            if draw_bboxes:
                polygon = np.array(region["polygon"], np.int32)
                polygon = polygon.reshape((-1, 1, 2))
                cv2.polylines(annotated, [polygon], True, bgr_color, 2)

            if draw_translations and translated_text:
                font_size = self._get_font_size(
                    region["height"],
                    len(translated_text),
                    region["width"]
                )

                x, y, position = self._get_translation_position(
                    region,
                    (h, w),
                    translated_text,
                    font_size
                )

                try:
                    img_pil = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
                    draw = ImageDraw.Draw(img_pil)

                    if self.font_path:
                        font = ImageFont.truetype(self.font_path, font_size)
                    else:
                        font = ImageFont.load_default()

                    text_bbox = draw.textbbox((0, 0), translated_text, font=font)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]

                    padding = 4
                    bg_x1 = x - padding
                    bg_y1 = y - padding
                    bg_x2 = x + text_width + padding
                    bg_y2 = y + text_height + padding

                    draw.rectangle(
                        [bg_x1, bg_y1, bg_x2, bg_y2],
                        fill=(color[0], color[1], color[2], 200)
                    )

                    draw.text((x, y), translated_text, font=font, fill=(255, 255, 255))

                    if position in ["right", "left"]:
                        line_y = int(region["center_y"])
                        if position == "right":
                            line_x1 = int(region["bbox"][2])
                            line_x2 = bg_x1
                        else:
                            line_x1 = bg_x2
                            line_x2 = int(region["bbox"][0])
                        draw.line([(line_x1, line_y), (line_x2, line_y)], fill=(color[0], color[1], color[2]), width=2)
                    elif position in ["top", "bottom"]:
                        line_x = int(region["center_x"])
                        if position == "bottom":
                            line_y1 = int(region["bbox"][3])
                            line_y2 = bg_y1
                        else:
                            line_y1 = bg_y2
                            line_y2 = int(region["bbox"][1])
                        draw.line([(line_x, line_y1), (line_x, line_y2)], fill=(color[0], color[1], color[2]), width=2)

                    annotated = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

                except Exception as e:
                    print(f"Error drawing text: {e}")
                    cv2.putText(
                        annotated,
                        translated_text,
                        (x, y + font_size),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        font_size / 30,
                        bgr_color,
                        2
                    )

        return annotated

    def create_comparison_image(
        self,
        original_image: np.ndarray,
        annotated_image: np.ndarray
    ) -> np.ndarray:
        h1, w1 = original_image.shape[:2]
        h2, w2 = annotated_image.shape[:2]

        max_h = max(h1, h2)
        total_w = w1 + w2 + 10

        comparison = np.ones((max_h, total_w, 3), dtype=np.uint8) * 255

        comparison[:h1, :w1] = original_image
        comparison[:h2, w1 + 10:w1 + 10 + w2] = annotated_image

        return comparison
