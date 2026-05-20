import os
import sys
import asyncio
import threading
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.feature_extractor import FeatureExtractor
from backend.vector_db import VectorDatabase
from backend.index_images import build_index

app = FastAPI(title="图文检索系统", description="基于CLIP模型的图文检索系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

extractor = None
db = None

index_progress = {
    "task_id": None,
    "status": "idle",
    "stage": None,
    "progress": 0,
    "processed": 0,
    "message": "",
    "error": None,
    "start_time": None,
    "end_time": None,
    "result": None
}

index_lock = threading.Lock()


@app.on_event("startup")
async def startup_event():
    global extractor, db
    print("Loading CLIP model...")
    extractor = FeatureExtractor()
    print("Loading vector database...")
    db = VectorDatabase(index_dir="index")
    print(f"Loaded {db.get_total_images()} images from index")


class TextSearchRequest(BaseModel):
    text: str
    top_k: int = 10


class SearchResponse(BaseModel):
    results: List[Dict]
    total: int


@app.get("/")
async def root():
    frontend_path = project_root / "frontend" / "index.html"
    if frontend_path.exists():
        return FileResponse(str(frontend_path))
    return {"message": "图文检索系统 API", "docs": "/docs"}


@app.get("/api/stats")
async def get_stats():
    return {
        "total_images": db.get_total_images() if db else 0,
        "model": "ViT-B-32",
        "feature_dimension": 512
    }


@app.post("/api/search/text", response_model=SearchResponse)
async def search_by_text(request: TextSearchRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="搜索文本不能为空")
    
    if request.top_k < 1 or request.top_k > 100:
        raise HTTPException(status_code=400, detail="返回结果数量必须在 1-100 之间")

    text_feature = extractor.extract_text_feature(request.text)
    results = db.search(text_feature, top_k=request.top_k)

    return SearchResponse(
        results=results,
        total=len(results)
    )


@app.post("/api/search/image", response_model=SearchResponse)
async def search_by_image(file: UploadFile = File(...), top_k: int = Form(10)):
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片格式。支持的格式: {allowed_types}"
        )
    
    if top_k < 1 or top_k > 100:
        raise HTTPException(status_code=400, detail="返回结果数量必须在 1-100 之间")

    try:
        image_bytes = await file.read()
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="图片大小不能超过 20MB")
            
        image_feature = extractor.extract_image_feature_from_bytes(image_bytes)
        results = db.search(image_feature, top_k=top_k)

        return SearchResponse(
            results=results,
            total=len(results)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理图片时出错: {str(e)}")


def run_index_build(task_id: str, reset: bool = True):
    global index_progress, db
    
    def progress_callback(stage: str, progress: int, processed: int, message: str):
        with index_lock:
            index_progress["stage"] = stage
            index_progress["progress"] = progress
            index_progress["processed"] = processed
            index_progress["message"] = message
            if stage == "complete":
                index_progress["status"] = "completed"
                index_progress["end_time"] = datetime.now().isoformat()
    
    try:
        with index_lock:
            index_progress["status"] = "running"
            index_progress["start_time"] = datetime.now().isoformat()
            index_progress["error"] = None
            index_progress["result"] = None
        
        build_index(
            images_dir="images", 
            index_dir="index", 
            reset=reset,
            progress_callback=progress_callback
        )
        
        with index_lock:
            db = VectorDatabase(index_dir="index")
            index_progress["result"] = {"total_images": db.get_total_images()}
            
    except Exception as e:
        with index_lock:
            index_progress["status"] = "failed"
            index_progress["error"] = str(e)
            index_progress["end_time"] = datetime.now().isoformat()


@app.post("/api/index/rebuild")
async def rebuild_index(reset: bool = True):
    with index_lock:
        if index_progress["status"] == "running":
            raise HTTPException(
                status_code=409, 
                detail="索引正在构建中，请等待完成后再试"
            )
        
        task_id = str(uuid.uuid4())
        index_progress["task_id"] = task_id
        index_progress["status"] = "pending"
        index_progress["progress"] = 0
        index_progress["processed"] = 0
        index_progress["stage"] = None
        index_progress["message"] = "正在准备..."
        index_progress["error"] = None
        index_progress["result"] = None
    
    thread = threading.Thread(
        target=run_index_build,
        args=(task_id, reset),
        daemon=True
    )
    thread.start()
    
    return {
        "task_id": task_id,
        "status": "started",
        "message": "索引构建已启动，请使用 /api/index/progress 查询进度"
    }


@app.get("/api/index/progress")
async def get_index_progress():
    with index_lock:
        return {
            "task_id": index_progress["task_id"],
            "status": index_progress["status"],
            "stage": index_progress["stage"],
            "progress": index_progress["progress"],
            "processed": index_progress["processed"],
            "message": index_progress["message"],
            "error": index_progress["error"],
            "start_time": index_progress["start_time"],
            "end_time": index_progress["end_time"],
            "result": index_progress["result"]
        }


@app.get("/api/images/{image_path:path}")
async def get_image(image_path: str):
    full_path = Path(image_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(full_path))


if os.path.exists(project_root / "frontend"):
    app.mount("/static", StaticFiles(directory=str(project_root / "frontend")), name="static")

if os.path.exists(project_root / "images"):
    app.mount("/images", StaticFiles(directory=str(project_root / "images")), name="images")
