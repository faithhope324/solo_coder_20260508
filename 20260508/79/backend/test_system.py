import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("测试图像超分辨率批处理系统")
print("=" * 60)

print("\n1. 测试任务队列系统...")
try:
    from task_queue import TaskQueue, Task, TaskStatus
    import time
    
    queue = TaskQueue(max_concurrent=2, max_queue_size=10)
    
    task1 = Task(task_id="test1", filename="test1.jpg", model_type="esrgan", scale=4)
    task2 = Task(task_id="test2", filename="test2.jpg", model_type="swinir", scale=2)
    task3 = Task(task_id="test3", filename="test3.jpg", model_type="esrgan", scale=4)
    
    assert queue.add_task(task1) == True
    assert queue.add_task(task2) == True
    assert queue.add_task(task3) == True
    
    assert task1.queue_position == 1
    assert task2.queue_position == 2
    assert task3.queue_position == 3
    
    next_task = queue.get_next_task()
    assert next_task.task_id == "test1"
    assert next_task.status == TaskStatus.PROCESSING
    
    assert task2.queue_position == 1
    assert task3.queue_position == 2
    
    queue.update_progress("test1", 50)
    task1_progress = queue.get_task("test1")
    assert task1_progress.progress == 50
    
    queue.complete_task("test1", "/tmp/result1.jpg")
    task1_completed = queue.get_task("test1")
    assert task1_completed.status == TaskStatus.COMPLETED
    assert task1_completed.progress == 100
    
    queue.fail_task("test2", "Test error")
    task2_failed = queue.get_task("test2")
    assert task2_failed.status == TaskStatus.FAILED
    assert task2_failed.error == "Test error"
    
    status = queue.get_queue_status()
    assert status["processing"] == 0
    assert status["queued"] == 1
    
    print("   ✅ 任务队列系统测试通过")
except Exception as e:
    print(f"   ❌ 任务队列系统测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n2. 测试ESRGAN模型...")
try:
    import torch
    from models.esrgan import ESRGAN, RRDBNet
    
    device = torch.device("cpu")
    model = ESRGAN(device=device)
    
    test_img_path = os.path.join(os.path.dirname(__file__), "test_input.jpg")
    from PIL import Image
    import numpy as np
    
    test_img = Image.new("RGB", (100, 100), color=(128, 128, 128))
    for x in range(100):
        for y in range(100):
            r = int(x * 2.55)
            g = int(y * 2.55)
            b = 128
            test_img.putpixel((x, y), (r, g, b))
    test_img.save(test_img_path)
    
    progress_values = []
    def progress_cb(p):
        progress_values.append(p)
    
    result_path = model.enhance(test_img_path, scale=2, progress_callback=progress_cb)
    
    assert os.path.exists(result_path)
    result_img = Image.open(result_path)
    assert result_img.size[0] >= 200
    assert result_img.size[1] >= 200
    assert len(progress_values) > 0
    
    os.remove(test_img_path)
    os.remove(result_path)
    
    print("   ✅ ESRGAN模型测试通过")
    print(f"     - 输入尺寸: 100x100, 输出尺寸: {result_img.size[0]}x{result_img.size[1]}")
    print(f"     - 进度回调次数: {len(progress_values)}")
except Exception as e:
    print(f"   ❌ ESRGAN模型测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3. 测试SwinIR模型...")
try:
    import torch
    from models.swinir import SwinIRModel, SwinIR
    
    device = torch.device("cpu")
    model = SwinIRModel(device=device)
    
    test_img_path = os.path.join(os.path.dirname(__file__), "test_input2.jpg")
    from PIL import Image
    
    test_img = Image.new("RGB", (80, 80), color=(200, 100, 50))
    for x in range(80):
        for y in range(80):
            r = 255 if (x + y) % 2 == 0 else 0
            g = 128
            b = int(x * 3)
            test_img.putpixel((x, y), (r, g, b))
    test_img.save(test_img_path)
    
    progress_values = []
    def progress_cb(p):
        progress_values.append(p)
    
    result_path = model.enhance(test_img_path, scale=4, progress_callback=progress_cb)
    
    assert os.path.exists(result_path)
    result_img = Image.open(result_path)
    assert result_img.size[0] >= 320
    assert result_img.size[1] >= 320
    
    os.remove(test_img_path)
    os.remove(result_path)
    
    print("   ✅ SwinIR模型测试通过")
    print(f"     - 输入尺寸: 80x80, 输出尺寸: {result_img.size[0]}x{result_img.size[1]}")
    print(f"     - 进度回调次数: {len(progress_values)}")
except Exception as e:
    print(f"   ❌ SwinIR模型测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n4. 测试FastAPI应用...")
try:
    from fastapi.testclient import TestClient
    import app
    
    client = TestClient(app.app)
    
    response = client.get("/")
    assert response.status_code == 200
    assert "图像超分辨率批处理系统" in response.json()["message"]
    
    response = client.get("/api/status")
    assert response.status_code == 200
    status_data = response.json()
    assert "queued" in status_data
    assert "processing" in status_data
    
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    
    print("   ✅ FastAPI应用测试通过")
except Exception as e:
    print(f"   ❌ FastAPI应用测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 所有测试通过！系统正常工作")
print("=" * 60)
print("\n启动命令:")
print("  cd backend")
print("  python app.py")
print("\n访问地址:")
print("  http://localhost:8000/frontend/")
