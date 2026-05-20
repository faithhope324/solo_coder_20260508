import asyncio
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Set

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from separator import AudioSeparator, get_separator

app = FastAPI(title="Real-time Audio Separation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
FRONTEND_DIR = BASE_DIR / "frontend"
TASKS_FILE = BASE_DIR / "tasks_state.json"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
FRONTEND_DIR.mkdir(exist_ok=True)

app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")

MAX_FILE_SIZE = 500 * 1024 * 1024
MAX_SEGMENT_DURATION = 60.0
MIN_SEGMENT_DURATION = 5.0


class SeparationTask:
    def __init__(
        self,
        task_id: str,
        input_path: str,
        output_dir: str,
        filename: str = "",
        status: str = "pending",
        progress: float = 0.0,
        message: str = "Waiting...",
        result: Optional[Dict] = None,
        error: Optional[str] = None,
        created_at: Optional[float] = None,
    ):
        self.task_id = task_id
        self.input_path = input_path
        self.output_dir = output_dir
        self.filename = filename
        self.status = status
        self.progress = progress
        self.message = message
        self.result = result
        self.error = error
        self.created_at = created_at
        self._cancel_event: Optional[asyncio.Event] = None

    def to_dict(self) -> Dict:
        return {
            "task_id": self.task_id,
            "input_path": self.input_path,
            "output_dir": self.output_dir,
            "filename": self.filename,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "SeparationTask":
        return cls(
            task_id=data["task_id"],
            input_path=data["input_path"],
            output_dir=data["output_dir"],
            filename=data.get("filename", ""),
            status=data.get("status", "pending"),
            progress=data.get("progress", 0.0),
            message=data.get("message", "Waiting..."),
            result=data.get("result"),
            error=data.get("error"),
            created_at=data.get("created_at"),
        )

    def is_processing(self) -> bool:
        return self.status == "processing"

    def cancel(self):
        if self._cancel_event:
            self._cancel_event.set()

    def set_cancel_event(self, event: asyncio.Event):
        self._cancel_event = event

    def is_cancelled(self) -> bool:
        return self._cancel_event is not None and self._cancel_event.is_set()


tasks: Dict[str, SeparationTask] = {}
active_connections: Dict[str, List[WebSocket]] = {}
cancelled_tasks: Set[str] = set()


def save_tasks():
    serializable = {tid: task.to_dict() for tid, task in tasks.items()}
    try:
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(serializable, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving tasks: {e}")


def load_tasks():
    if not TASKS_FILE.exists():
        return

    try:
        with open(TASKS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        for tid, task_data in data.items():
            input_path = Path(task_data.get("input_path", ""))
            output_dir = Path(task_data.get("output_dir", ""))

            if not input_path.exists():
                print(f"Skipping task {tid}: input file not found")
                continue

            task = SeparationTask.from_dict(task_data)

            if task.status == "processing":
                task.status = "interrupted"
                task.message = "Task interrupted by server restart"
                task.progress = 0.0

            tasks[tid] = task

        print(f"Loaded {len(tasks)} tasks from disk")
    except Exception as e:
        print(f"Error loading tasks: {e}")


@app.on_event("startup")
async def startup_event():
    load_tasks()

    try:
        get_separator()
        print("Model loaded successfully on startup")
    except Exception as e:
        print(f"Error loading model on startup: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    save_tasks()
    print("Tasks saved to disk")


@app.get("/api/health")
async def health_check():
    separator = get_separator()
    return {
        "status": "healthy",
        "model": separator.model_name,
        "device": separator.device,
        "sources": separator.sources,
        "task_count": len(tasks),
    }


@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )

    task_id = str(uuid.uuid4())
    task_dir = UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    input_path = task_dir / f"input{ext}"

    total_size = 0
    async with aiofiles.open(str(input_path), "wb") as out_file:
        while content := await file.read(1024 * 1024):
            total_size += len(content)
            if total_size > MAX_FILE_SIZE:
                await out_file.close()
                shutil.rmtree(task_dir)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)} MB"
                )
            await out_file.write(content)

    output_dir = OUTPUT_DIR / task_id
    output_dir.mkdir(parents=True, exist_ok=True)

    import time
    task = SeparationTask(
        task_id=task_id,
        input_path=str(input_path),
        output_dir=str(output_dir),
        filename=file.filename,
        status="uploaded",
        created_at=time.time()
    )
    tasks[task_id] = task
    save_tasks()

    return {
        "task_id": task_id,
        "filename": file.filename,
        "status": "uploaded",
        "size_mb": round(total_size / (1024 * 1024), 2)
    }


@app.post("/api/separate/{task_id}")
async def start_separation(task_id: str, segment_duration: float = 10.0):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    if not (MIN_SEGMENT_DURATION <= segment_duration <= MAX_SEGMENT_DURATION):
        raise HTTPException(
            status_code=400,
            detail=f"segment_duration must be between {MIN_SEGMENT_DURATION} and {MAX_SEGMENT_DURATION} seconds"
        )

    task = tasks[task_id]

    if task.is_processing():
        raise HTTPException(status_code=400, detail="Task already processing")

    if task.status == "cancelling":
        raise HTTPException(status_code=400, detail="Task is being cancelled")

    if task_id in cancelled_tasks:
        cancelled_tasks.discard(task_id)

    task.status = "processing"
    task.progress = 0.0
    task.message = "Starting separation..."
    task.error = None
    save_tasks()

    cancel_event = asyncio.Event()
    task.set_cancel_event(cancel_event)

    asyncio.create_task(run_separation(task_id, segment_duration, cancel_event))

    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Separation started"
    }


@app.post("/api/cancel/{task_id}")
async def cancel_task(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]

    if not task.is_processing():
        raise HTTPException(status_code=400, detail="Task is not processing")

    task.status = "cancelling"
    task.message = "Cancelling..."
    task.cancel()
    cancelled_tasks.add(task_id)
    save_tasks()

    await send_progress(task_id, task.progress, "Cancelling...", "cancelling")

    return {
        "task_id": task_id,
        "status": "cancelling",
        "message": "Task cancellation requested"
    }


async def run_separation(task_id: str, segment_duration: float, cancel_event: asyncio.Event):
    task = tasks.get(task_id)
    if not task:
        return

    try:
        separator = get_separator()

        async def progress_callback(progress: float, message: str):
            if cancel_event.is_set():
                raise asyncio.CancelledError("Task cancelled by user")
            task.progress = progress
            task.message = message
            await send_progress(task_id, progress, message, "processing")

        await send_progress(task_id, 0.0, "Initializing...", "processing")

        result = await separator.separate_file(
            input_path=task.input_path,
            output_dir=task.output_dir,
            progress_callback=progress_callback,
            segment_duration=segment_duration
        )

        if cancel_event.is_set():
            raise asyncio.CancelledError("Task cancelled by user")

        task.result = result
        task.status = "completed"
        task.progress = 1.0
        save_tasks()

        await send_progress(task_id, 1.0, "Separation complete!", "completed", result)

    except asyncio.CancelledError:
        task.status = "cancelled"
        task.message = "Task cancelled by user"
        task.progress = 0.0
        save_tasks()
        await send_progress(task_id, 0.0, "Task cancelled", "cancelled")

    except Exception as e:
        task.status = "failed"
        task.error = str(e)
        task.message = f"Error: {str(e)}"
        save_tasks()
        await send_progress(task_id, task.progress, f"Error: {str(e)}", "failed")

    finally:
        if task_id in cancelled_tasks:
            cancelled_tasks.discard(task_id)


async def send_progress(
    task_id: str,
    progress: float,
    message: str,
    status: str,
    result: Optional[Dict] = None
):
    connections = active_connections.get(task_id, [])
    if not connections:
        return

    data = {
        "task_id": task_id,
        "progress": progress,
        "message": message,
        "status": status
    }
    if result:
        data["result"] = {
            "sources": result["sources"],
            "duration": result["duration"],
            "sample_rate": result["sample_rate"]
        }

    disconnected = []
    for ws in connections:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            disconnected.append(ws)

    for ws in disconnected:
        connections.remove(ws)
        try:
            await ws.close()
        except Exception:
            pass

    if not connections and task_id in active_connections:
        del active_connections[task_id]


@app.websocket("/ws/progress/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()

    if task_id not in active_connections:
        active_connections[task_id] = []
    active_connections[task_id].append(websocket)

    try:
        task = tasks.get(task_id)
        if task:
            initial_data = {
                "task_id": task_id,
                "progress": task.progress,
                "message": task.message,
                "status": task.status
            }
            if task.result:
                initial_data["result"] = {
                    "sources": task.result["sources"],
                    "duration": task.result["duration"],
                    "sample_rate": task.result["sample_rate"]
                }
            await websocket.send_text(json.dumps(initial_data))

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if task_id in active_connections:
            if websocket in active_connections[task_id]:
                active_connections[task_id].remove(websocket)
            if not active_connections[task_id]:
                del active_connections[task_id]


@app.get("/api/tasks")
async def list_tasks(limit: int = 50, offset: int = 0):
    task_list = sorted(
        tasks.values(),
        key=lambda t: t.created_at or 0,
        reverse=True
    )
    paginated = task_list[offset:offset + limit]

    return {
        "total": len(task_list),
        "limit": limit,
        "offset": offset,
        "tasks": [
            {
                "task_id": t.task_id,
                "filename": t.filename,
                "status": t.status,
                "progress": t.progress,
                "message": t.message,
                "created_at": t.created_at,
                "has_result": t.result is not None
            }
            for t in paginated
        ]
    }


@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    response = {
        "task_id": task_id,
        "filename": task.filename,
        "status": task.status,
        "progress": task.progress,
        "message": task.message,
        "created_at": task.created_at
    }
    if task.result:
        response["result"] = {
            "sources": task.result["sources"],
            "duration": task.result["duration"],
            "sample_rate": task.result["sample_rate"]
        }
    if task.error:
        response["error"] = task.error

    return response


@app.get("/api/download/{task_id}/{source}")
async def download_track(task_id: str, source: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    if task.status != "completed" or not task.result:
        raise HTTPException(status_code=400, detail="Task not completed")

    file_path = Path(task.output_dir) / f"{source}.wav"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Track not found")

    return FileResponse(
        path=str(file_path),
        media_type="audio/wav",
        filename=f"{task_id}_{source}.wav"
    )


@app.get("/api/audio/{task_id}/{source}")
async def stream_audio(task_id: str, source: str):
    return await download_track(task_id, source)


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]

    if task.is_processing():
        raise HTTPException(
            status_code=400,
            detail="Task is processing. Cancel it first using POST /api/cancel/{task_id}"
        )

    try:
        input_dir = Path(task.input_path).parent
        if input_dir.exists():
            shutil.rmtree(input_dir)
    except Exception as e:
        print(f"Error deleting input dir: {e}")

    try:
        output_dir = Path(task.output_dir)
        if output_dir.exists():
            shutil.rmtree(output_dir)
    except Exception as e:
        print(f"Error deleting output dir: {e}")

    del tasks[task_id]
    if task_id in active_connections:
        for ws in active_connections[task_id]:
            try:
                await ws.close()
            except Exception:
                pass
        del active_connections[task_id]

    save_tasks()

    return {"status": "success", "message": "Task deleted"}


@app.get("/")
async def root():
    return {"message": "Audio Separation API. Visit /frontend/index.html for the web interface."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
