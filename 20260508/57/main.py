from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
import uvicorn
from datetime import datetime

from tracker.video_processor import VideoProcessor
from tracker.counter import LineCounter
from tracker.csv_exporter import export_results_to_csv

app = FastAPI(title="视频目标跟踪与计数系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
RESULTS_DIR = Path("results")
STATIC_DIR = Path("static")
UPLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

video_processors: Dict[str, VideoProcessor] = {}
processing_status: Dict[str, Dict[str, Any]] = {}


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/status")
async def get_status(task_id: Optional[str] = None):
    if task_id:
        if task_id in processing_status:
            return processing_status[task_id]
        raise HTTPException(status_code=404, detail="Task not found")
    return {"tasks": list(processing_status.keys())}


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    task_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()
    
    if ext not in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
        raise HTTPException(status_code=400, detail="Unsupported video format")
    
    save_path = UPLOAD_DIR / f"{task_id}{ext}"
    
    with save_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    processing_status[task_id] = {
        "task_id": task_id,
        "status": "uploaded",
        "filename": file.filename,
        "video_path": str(save_path),
        "created_at": datetime.now().isoformat(),
        "progress": 0
    }
    
    return {"task_id": task_id, "message": "Upload successful"}


@app.post("/api/process")
async def process_video(
    task_id: str = Form(...),
    target_classes: str = Form("person,car,truck,bicycle,motorcycle,bus"),
    line_start: str = Form("0.5,0.0"),
    line_end: str = Form("0.5,1.0"),
    confidence_threshold: float = Form(0.5),
    frame_interval: int = Form(1)
):
    if task_id not in processing_status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = processing_status[task_id]
    video_path = Path(task_info["video_path"])
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        line_start_coords = tuple(map(float, line_start.split(',')))
        line_end_coords = tuple(map(float, line_end.split(',')))
        target_class_list = [c.strip() for c in target_classes.split(',')]
        
        task_info["status"] = "processing"
        task_info["progress"] = 0
        
        line_counter = LineCounter(
            line_start=line_start_coords,
            line_end=line_end_coords,
            target_classes=target_class_list
        )
        
        processor = VideoProcessor(
            video_path=str(video_path),
            line_counter=line_counter,
            confidence_threshold=confidence_threshold,
            frame_interval=frame_interval,
            task_id=task_id
        )
        
        video_processors[task_id] = processor
        
        def progress_callback(progress: int, current_frame: int, total_frames: int):
            task_info["progress"] = progress
            task_info["current_frame"] = current_frame
            task_info["total_frames"] = total_frames
        
        results = await processor.process_video(progress_callback)
        
        output_path = RESULTS_DIR / f"{task_id}_results.json"
        import json
        with output_path.open('w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        csv_path = RESULTS_DIR / f"{task_id}_results.csv"
        export_results_to_csv(results, str(csv_path))
        
        task_info["status"] = "completed"
        task_info["progress"] = 100
        task_info["results_path"] = str(output_path)
        task_info["csv_path"] = str(csv_path)
        task_info["counts"] = results.get("counts", {})
        task_info["total_frames"] = results.get("total_frames", 0)
        task_info["fps"] = results.get("fps", 0)
        task_info["duration"] = results.get("duration", 0)
        
        return {
            "task_id": task_id,
            "status": "completed",
            "counts": results.get("counts", {}),
            "total_tracks": len(results.get("tracks", {})),
            "duration": results.get("duration", 0)
        }
        
    except Exception as e:
        task_info["status"] = "failed"
        task_info["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/results/{task_id}")
async def get_results(task_id: str):
    results_path = RESULTS_DIR / f"{task_id}_results.json"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="Results not found")
    
    import json
    with results_path.open('r', encoding='utf-8') as f:
        results = json.load(f)
    
    return results


@app.get("/api/download/{task_id}/csv")
async def download_csv(task_id: str):
    csv_path = RESULTS_DIR / f"{task_id}_results.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    return FileResponse(
        path=str(csv_path),
        filename=f"tracking_results_{task_id}.csv",
        media_type="text/csv"
    )


@app.get("/api/frame/{task_id}/{frame_number}")
async def get_frame(task_id: str, frame_number: int):
    if task_id not in video_processors:
        results_path = RESULTS_DIR / f"{task_id}_results.json"
        if not results_path.exists():
            raise HTTPException(status_code=404, detail="Task not found")
        import json
        with results_path.open('r', encoding='utf-8') as f:
            results = json.load(f)
        video_path = results.get("video_path", "")
    else:
        video_path = video_processors[task_id].video_path
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    import cv2
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=404, detail="Frame not found")
    
    temp_path = RESULTS_DIR / f"{task_id}_frame_{frame_number}.jpg"
    cv2.imwrite(str(temp_path), frame)
    
    return FileResponse(
        path=str(temp_path),
        filename=f"frame_{frame_number}.jpg",
        media_type="image/jpeg"
    )


@app.get("/api/tasks")
async def list_tasks():
    return {"tasks": list(processing_status.values())}


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    if task_id in processing_status:
        del processing_status[task_id]
    if task_id in video_processors:
        del video_processors[task_id]
    
    video_ext = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    for ext in video_ext:
        video_file = UPLOAD_DIR / f"{task_id}{ext}"
        if video_file.exists():
            video_file.unlink()
    
    results_file = RESULTS_DIR / f"{task_id}_results.json"
    if results_file.exists():
        results_file.unlink()
    
    csv_file = RESULTS_DIR / f"{task_id}_results.csv"
    if csv_file.exists():
        csv_file.unlink()
    
    return {"message": "Task deleted successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
