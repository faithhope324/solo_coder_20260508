import asyncio
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
import threading


class TaskStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    task_id: str
    filename: str
    model_type: str
    scale: int
    status: TaskStatus = TaskStatus.QUEUED
    progress: int = 0
    queue_position: int = 0
    original_path: str = ""
    result_path: str = ""
    error: str = ""
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


class TaskQueue:
    def __init__(self, max_concurrent: int = 1, max_queue_size: int = 100):
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        self.tasks: Dict[str, Task] = {}
        self.queue: List[str] = []
        self.processing: List[str] = []
        self._lock = threading.RLock()

    def add_task(self, task: Task) -> bool:
        with self._lock:
            if len(self.queue) + len(self.processing) >= self.max_queue_size:
                return False

            task.queue_position = len(self.queue) + len(self.processing) + 1
            task.status = TaskStatus.QUEUED
            self.tasks[task.task_id] = task
            self.queue.append(task.task_id)
            self._update_queue_positions()
            return True

    def get_next_task(self) -> Optional[Task]:
        with self._lock:
            if not self.queue:
                return None
            if len(self.processing) >= self.max_concurrent:
                return None

            task_id = self.queue.pop(0)
            task = self.tasks.get(task_id)
            if task:
                task.status = TaskStatus.PROCESSING
                task.started_at = time.time()
                self.processing.append(task_id)
            self._update_queue_positions()
            return task

    def complete_task(self, task_id: str, result_path: str):
        with self._lock:
            task = self.tasks.get(task_id)
            if task:
                task.status = TaskStatus.COMPLETED
                task.progress = 100
                task.result_path = result_path
                task.completed_at = time.time()
            if task_id in self.processing:
                self.processing.remove(task_id)

    def fail_task(self, task_id: str, error: str):
        with self._lock:
            task = self.tasks.get(task_id)
            if task:
                task.status = TaskStatus.FAILED
                task.error = error
                task.completed_at = time.time()
            if task_id in self.processing:
                self.processing.remove(task_id)
            self._update_queue_positions()

    def update_progress(self, task_id: str, progress: int):
        with self._lock:
            task = self.tasks.get(task_id)
            if task:
                task.progress = min(max(progress, 0), 100)

    def get_task(self, task_id: str) -> Optional[Task]:
        with self._lock:
            return self.tasks.get(task_id)

    def get_all_tasks(self) -> List[Task]:
        with self._lock:
            return list(self.tasks.values())

    def _update_queue_positions(self):
        processing_count = len(self.processing)
        for idx, task_id in enumerate(self.queue):
            task = self.tasks.get(task_id)
            if task:
                task.queue_position = processing_count + idx + 1

    def remove_task(self, task_id: str) -> bool:
        with self._lock:
            if task_id in self.queue:
                self.queue.remove(task_id)
                self._update_queue_positions()
            if task_id in self.processing:
                self.processing.remove(task_id)
            return self.tasks.pop(task_id, None) is not None

    def get_queue_status(self) -> Dict:
        with self._lock:
            return {
                "queued": len(self.queue),
                "processing": len(self.processing),
                "max_concurrent": self.max_concurrent,
                "max_queue_size": self.max_queue_size,
            }
