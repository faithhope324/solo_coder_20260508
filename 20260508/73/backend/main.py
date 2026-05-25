import io
import os
import base64
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from PIL import Image

from ocr_engine import OCREngine
from text_region_processor import TextRegionProcessor
from translator import Translator
from image_annotator import ImageAnnotator

app = FastAPI(title="场景文字识别与翻译系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend-static")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    
    @app.get("/")
    async def read_root():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

_ocr_engine = None
_region_processor = TextRegionProcessor()
_translator = Translator()
_image_annotator = ImageAnnotator()


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        print("正在初始化OCR引擎（首次运行会下载模型，约200MB，请耐心等待...）", flush=True)
        _ocr_engine = OCREngine()
        print("OCR引擎初始化完成！", flush=True)
    return _ocr_engine


def read_image(file: UploadFile) -> np.ndarray:
    try:
        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image file")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading image: {str(e)}")


def image_to_base64(image: np.ndarray) -> str:
    _, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer).decode("utf-8")


@app.post("/api/ocr")
async def ocr_endpoint(
    file: UploadFile = File(...),
    iou_threshold: float = Form(0.3)
):
    image = read_image(file)
    h, w = image.shape[:2]

    ocr_engine = get_ocr_engine()
    text_regions = ocr_engine.detect_and_recognize(image)
    processed_regions = _region_processor.process_regions(
        text_regions, h, iou_threshold
    )

    result = {
        "image_size": {"width": w, "height": h},
        "region_count": len(processed_regions),
        "regions": [
            {
                "id": idx,
                "bbox": r["bbox"],
                "polygon": r["polygon"],
                "text": r["text"],
                "confidence": r["confidence"],
                "center": {"x": r["center_x"], "y": r["center_y"]},
                "size": {"width": r["width"], "height": r["height"]},
                "merged_count": r.get("merged_count", 1)
            }
            for idx, r in enumerate(processed_regions)
        ]
    }

    return JSONResponse(content=result)


@app.post("/api/translate")
async def translate_endpoint(
    text: str = Form(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("en")
):
    translated = _translator.translate(text, source_lang, target_lang)
    return JSONResponse(content={
        "original": text,
        "translated": translated,
        "source_lang": source_lang,
        "target_lang": target_lang
    })


@app.post("/api/translate_batch")
async def translate_batch_endpoint(
    request: Request,
    source_lang: str = Form("auto"),
    target_lang: str = Form("en")
):
    form = await request.form()
    texts = form.getlist("texts")
    
    if not texts:
        texts = []
        for key in form.keys():
            if key.startswith("texts"):
                values = form.getlist(key)
                texts.extend(values)
    
    results = _translator.translate_batch(texts, source_lang, target_lang)
    return JSONResponse(content={"translations": results})


@app.post("/api/process")
async def process_endpoint(
    file: UploadFile = File(...),
    target_lang: str = Form("en"),
    source_lang: str = Form("auto"),
    iou_threshold: float = Form(0.3),
    draw_bboxes: bool = Form(True),
    draw_translations: bool = Form(True)
):
    image = read_image(file)
    h, w = image.shape[:2]

    ocr_engine = get_ocr_engine()
    text_regions = ocr_engine.detect_and_recognize(image)
    processed_regions = _region_processor.process_regions(
        text_regions, h, iou_threshold
    )

    texts = [r["text"] for r in processed_regions]
    translation_results = __translator.translate_batch(texts, source_lang, target_lang)
    translated_texts = [t["translated"] for t in translation_results]

    annotated_image = _image_annotator.annotate_image(
        image,
        processed_regions,
        translated_texts,
        draw_bboxes=draw_bboxes,
        draw_translations=draw_translations
    )

    comparison_image = _image_annotator.create_comparison_image(image, annotated_image)

    regions_result = [
        {
            "id": idx,
            "bbox": r["bbox"],
            "polygon": r["polygon"],
            "original_text": r["text"],
            "translated_text": translated_texts[idx],
            "confidence": r["confidence"],
            "center": {"x": r["center_x"], "y": r["center_y"]},
            "size": {"width": r["width"], "height": r["height"]},
            "merged_count": r.get("merged_count", 1)
        }
        for idx, r in enumerate(processed_regions)
    ]

    result = {
        "image_size": {"width": w, "height": h},
        "region_count": len(processed_regions),
        "regions": regions_result,
        "annotated_image": image_to_base64(annotated_image),
        "comparison_image": image_to_base64(comparison_image),
        "original_image": image_to_base64(image)
    }

    return JSONResponse(content=result)


@app.post("/api/download_annotated")
async def download_annotated_endpoint(
    file: UploadFile = File(...),
    target_lang: str = Form("en"),
    source_lang: str = Form("auto"),
    iou_threshold: float = Form(0.3),
    draw_bboxes: bool = Form(True),
    draw_translations: bool = Form(True),
    format: str = Form("png")
):
    image = read_image(file)
    h, w = image.shape[:2]

    ocr_engine = get_ocr_engine()
    text_regions = ocr_engine.detect_and_recognize(image)
    processed_regions = _region_processor.process_regions(
        text_regions, h, iou_threshold
    )

    texts = [r["text"] for r in processed_regions]
    translation_results = __translator.translate_batch(texts, source_lang, target_lang)
    translated_texts = [t["translated"] for t in translation_results]

    annotated_image = _image_annotator.annotate_image(
        image,
        processed_regions,
        translated_texts,
        draw_bboxes=draw_bboxes,
        draw_translations=draw_translations
    )

    ext = format.lower()
    if ext not in ["png", "jpg", "jpeg"]:
        ext = "png"
    
    encode_format = ".jpg" if ext in ["jpg", "jpeg"] else ".png"
    _, buffer = cv2.imencode(encode_format, annotated_image)
    
    return StreamingResponse(
        io.BytesIO(buffer.tobytes()),
        media_type=f"image/{ext}",
        headers={"Content-Disposition": f"attachment; filename=annotated_image.{ext}"}
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Scene Text Recognition and Translation System is running"}


@app.get("/api/languages")
async def get_supported_languages():
    return {
        "source_languages": [
            {"code": "auto", "name": "自动检测"},
            {"code": "zh", "name": "中文"},
            {"code": "en", "name": "英语"},
            {"code": "ja", "name": "日语"},
            {"code": "ko", "name": "韩语"},
            {"code": "fr", "name": "法语"},
            {"code": "de", "name": "德语"},
            {"code": "es", "name": "西班牙语"},
            {"code": "ru", "name": "俄语"},
        ],
        "target_languages": [
            {"code": "en", "name": "英语"},
            {"code": "zh", "name": "中文"},
            {"code": "ja", "name": "日语"},
            {"code": "ko", "name": "韩语"},
            {"code": "fr", "name": "法语"},
            {"code": "de", "name": "德语"},
            {"code": "es", "name": "西班牙语"},
            {"code": "ru", "name": "俄语"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
