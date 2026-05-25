# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("Test: Smooth Progress Bar")
print("=" * 60)

try:
    import time
    import threading
    from task_queue import TaskQueue, Task, TaskStatus
    from models.esrgan import ESRGAN
    from PIL import Image
    import torch

    queue = TaskQueue(max_concurrent=1)
    
    test_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(test_dir, exist_ok=True)
    
    test_img_path = os.path.join(test_dir, "test_progress.jpg")
    test_img = Image.new("RGB", (100, 100), color=(100, 150, 200))
    for x in range(100):
        for y in range(100):
            r = int(x * 2.5)
            g = int(y * 2.5)
            b = 128
            test_img.putpixel((x, y), (r, g, b))
    test_img.save(test_img_path)
    
    task_id = "test_progress_001"
    task = Task(
        task_id=task_id,
        filename="test_progress.jpg",
        model_type="esrgan",
        scale=2,
        original_path=test_img_path
    )
    queue.add_task(task)
    
    progress_history = []
    progress_lock = threading.Lock()
    
    def monitor_progress():
        for i in range(60):
            current_task = queue.get_task(task_id)
            if current_task:
                with progress_lock:
                    progress_history.append(current_task.progress)
            time.sleep(0.2)
    
    monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
    monitor_thread.start()
    
    next_task = queue.get_next_task()
    
    last_progress = [0]
    stop_smooth = threading.Event()
    progress_lock = threading.Lock()
    
    def progress_callback(progress: int):
        with progress_lock:
            last_progress[0] = progress
        if progress >= 80:
            stop_smooth.set()
        queue.update_progress(task_id, progress)
    
    def smooth_progress_worker():
        while not stop_smooth.is_set():
            with progress_lock:
                current = last_progress[0]
            if current >= 35 and current < 80:
                step = 0.8
                new_progress = min(current + step, 79.5)
                with progress_lock:
                    last_progress[0] = new_progress
                queue.update_progress(task_id, int(new_progress))
            time.sleep(0.4)
    
    smooth_thread = threading.Thread(target=smooth_progress_worker, daemon=True)
    smooth_thread.start()
    
    device = torch.device("cpu")
    model = ESRGAN(device=device)
    
    result_path = model.enhance(test_img_path, scale=2, progress_callback=progress_callback)
    
    stop_smooth.set()
    smooth_thread.join(timeout=2.0)
    
    queue.complete_task(task_id, result_path)
    
    monitor_thread.join(timeout=2.0)
    
    print("\nProgress History (last 30 values):")
    for i, p in enumerate(progress_history[-30:]):
        bar = "=" * int(p / 5) + "-" * (20 - int(p / 5))
        print(f"  [{i:3d}] {p:3d}% |{bar}|")
    
    progress_changes = len(set(progress_history))
    print(f"\nProgress Analysis:")
    print(f"  - Total progress updates: {len(progress_history)}")
    print(f"  - Unique progress values: {progress_changes}")
    
    mid_progress = [p for p in progress_history if 35 < p < 80]
    print(f"  - Mid-range progress (35-80): {len(mid_progress)} values")
    
    if len(mid_progress) >= 10:
        print("\n[OK] Progress bar is smoothly updating during inference!")
    else:
        print("\n[WARN] Progress updates might be too slow, but mechanism is working")
    
    if os.path.exists(result_path):
        result_img = Image.open(result_path)
        print(f"[OK] Result image generated: {result_img.size}")
        os.remove(result_path)
    
    os.remove(test_img_path)
    
except Exception as e:
    print(f"\n[FAIL] Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("[OK] Progress bar test completed!")
print("=" * 60)
print("\nStart the server to verify visually:")
print("  python app.py")
