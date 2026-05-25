import os
import io
import uuid
import time
import threading
from pathlib import Path
from typing import List, Optional
from zipfile import ZipFile
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from task_queue import TaskQueue, Task, TaskStatus
from models import ESRGAN, SwinIRModel


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="图像超分辨率批处理系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/frontend", StaticFiles(directory=BASE_DIR.parent / "frontend", html=True), name="frontend")

MAX_CONCURRENT = 1
MAX_QUEUE_SIZE = 50
task_queue = TaskQueue(max_concurrent=MAX_CONCURRENT, max_queue_size=MAX_QUEUE_SIZE)

esrgan_model: Optional[ESRGAN] = None
swinir_model: Optional[SwinIRModel] = None
_model_lock = threading.Lock()


def get_model(model_type: str):
    global esrgan_model, swinir_model
    with _model_lock:
        if model_type == "esrgan":
            if esrgan_model is None:
                esrgan_model = ESRGAN()
            return esrgan_model
        elif model_type == "swinir":
            if swinir_model is None:
                swinir_model = SwinIRModel()
            return swinir_model
        else:
            raise ValueError(f"Unknown model type: {model_type}")


def process_task(task: Task):
    try:
        last_progress = [0]
        stop_smooth = threading.Event()
        progress_lock = threading.Lock()

        def progress_callback(progress: int):
            with progress_lock:
                last_progress[0] = progress
            if progress >= 80:
                stop_smooth.set()
            task_queue.update_progress(task.task_id, progress)

        def smooth_progress_worker():
            while not stop_smooth.is_set():
                with progress_lock:
                    current = last_progress[0]
                if current >= 35 and current < 80:
                    step = 0.8
                    new_progress = min(current + step, 79.5)
                    with progress_lock:
                        last_progress[0] = new_progress
                    task_queue.update_progress(task.task_id, int(new_progress))
                time.sleep(0.4)

        smooth_thread = threading.Thread(target=smooth_progress_worker, daemon=True)
        smooth_thread.start()

        try:
            model = get_model(task.model_type)
            result_path = model.enhance(task.original_path, task.scale, progress_callback)
            task_queue.complete_task(task.task_id, result_path)
        finally:
            stop_smooth.set()
            smooth_thread.join(timeout=1.0)
    except Exception as e:
        task_queue.fail_task(task.task_id, str(e))
        print(f"Task {task.task_id} failed: {e}")


def worker_loop():
    while True:
        task = task_queue.get_next_task()
        if task:
            process_task(task)
        else:
            time.sleep(0.5)


worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()


class TaskResponse(BaseModel):
    task_id: str
    filename: str
    model_type: str
    scale: int
    status: str
    progress: int
    queue_position: int
    error: Optional[str] = None
    original_url: Optional[str] = None
    result_url: Optional[str] = None
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


def task_to_response(task: Task) -> TaskResponse:
    base_name = os.path.basename(task.original_path) if task.original_path else ""
    result_name = os.path.basename(task.result_path) if task.result_path else ""
    return TaskResponse(
        task_id=task.task_id,
        filename=task.filename,
        model_type=task.model_type,
        scale=task.scale,
        status=task.status.value,
        progress=task.progress,
        queue_position=task.queue_position,
        error=task.error or None,
        original_url=f"/uploads/{base_name}" if base_name else None,
        result_url=f"/results/{result_name}" if result_name and task.status == TaskStatus.COMPLETED else None,
        created_at=task.created_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
    )


@app.get("/")
async def root():
    return {"message": "图像超分辨率批处理系统 API"}


@app.get("/api/status")
async def get_queue_status():
    return task_queue.get_queue_status()


@app.post("/api/upload", response_model=List[TaskResponse])
async def upload_images(
    files: List[UploadFile] = File(...),
    model_type: str = Form("esrgan"),
    scale: int = Form(4),
):
    if model_type not in ["esrgan", "swinir"]:
        raise HTTPException(status_code=400, detail="Invalid model type")
    if scale not in [2, 4]:
        raise HTTPException(status_code=400, detail="Scale must be 2 or 4")

    allowed_ext = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    results = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_ext:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        file_id = str(uuid.uuid4())
        filename = f"{file_id}{ext}"
        upload_path = UPLOAD_DIR / filename

        content = await file.read()
        with open(upload_path, "wb") as f:
            f.write(content)

        task = Task(
            task_id=file_id,
            filename=file.filename,
            model_type=model_type,
            scale=scale,
            original_path=str(upload_path),
        )

        if not task_queue.add_task(task):
            os.remove(upload_path)
            raise HTTPException(status_code=503, detail="Task queue is full")

        results.append(task_to_response(task))

    return results


@app.get("/api/tasks", response_model=List[TaskResponse])
async def get_all_tasks():
    tasks = task_queue.get_all_tasks()
    return [task_to_response(t) for t in tasks]


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    task = task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_to_response(task)


@app.get("/uploads/{filename}")
async def get_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.get("/results/{filename}")
async def get_result(filename: str):
    file_path = RESULT_DIR / filename
    if not file_path.exists():
        file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.post("/api/download/batch")
async def download_batch(task_ids: List[str]):
    if not task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")

    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, "w") as zip_file:
        for task_id in task_ids:
            task = task_queue.get_task(task_id)
            if not task or task.status != TaskStatus.COMPLETED:
                continue

            result_path = Path(task.result_path)
            if result_path.exists():
                original_name = os.path.splitext(task.filename)[0]
                ext = result_path.suffix
                arcname = f"{original_name}_x{task.scale}{ext}"
                zip_file.write(str(result_path), arcname=arcname)

    zip_buffer.seek(0)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=super_resolution_{timestamp}.zip"},
    )


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    task = task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status in [TaskStatus.QUEUED, TaskStatus.PROCESSING, TaskStatus.FAILED, TaskStatus.COMPLETED]:
        task_queue.remove_task(task_id)
        for path in [task.original_path, task.result_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass

    return {"success": True}


@app.delete("/api/tasks")
async def clear_completed_tasks():
    tasks = task_queue.get_all_tasks()
    removed = 0
    for task in tasks:
        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            task_queue.remove_task(task.task_id)
            for path in [task.original_path, task.result_path]:
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except:
                        pass
            removed += 1
    return {"removed": removed}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
