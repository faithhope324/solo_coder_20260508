"""
任务管理模块
异步任务队列，支持任务ID轮询结果
"""
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable, Any


@dataclass
class Task:
    id: str
    status: str = "pending"
    result: Any = None
    error: str = None
    created_at: float = field(default_factory=time.time)
    completed_at: float = None


class TaskManager:
    def __init__(self):
        self.tasks: dict[str, Task] = {}
        self.lock = threading.Lock()

    def create_task(self, func: Callable, *args, **kwargs) -> str:
        task_id = str(uuid.uuid4())
        task = Task(id=task_id)

        with self.lock:
            self.tasks[task_id] = task

        thread = threading.Thread(
            target=self._run_task,
            args=(task_id, func, args, kwargs),
            daemon=True,
        )
        thread.start()

        return task_id

    def _run_task(self, task_id: str, func: Callable, args: tuple, kwargs: dict):
        with self.lock:
            task = self.tasks.get(task_id)
            if task:
                task.status = "running"

        try:
            result = func(*args, **kwargs)
            with self.lock:
                task = self.tasks.get(task_id)
                if task:
                    task.status = "completed"
                    task.result = result
                    task.completed_at = time.time()
        except Exception as e:
            with self.lock:
                task = self.tasks.get(task_id)
                if task:
                    task.status = "failed"
                    task.error = str(e)
                    task.completed_at = time.time()

    def get_task(self, task_id: str) -> Task | None:
        with self.lock:
            return self.tasks.get(task_id)

    def cleanup_old_tasks(self, max_age: int = 3600):
        now = time.time()
        with self.lock:
            to_delete = [
                tid for tid, task in self.tasks.items()
                if task.completed_at and (now - task.completed_at) > max_age
            ]
            for tid in to_delete:
                del self.tasks[tid]


task_manager = TaskManager()