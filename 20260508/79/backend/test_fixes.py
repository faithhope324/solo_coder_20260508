import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("验证三个问题修复测试")
print("=" * 60)

print("\n1. 测试颜色通道修复（图像空白问题）...")
try:
    import torch
    import numpy as np
    from PIL import Image
    from models.esrgan import ESRGAN
    
    device = torch.device("cpu")
    model = ESRGAN(device=device)
    
    test_img_path = os.path.join(os.path.dirname(__file__), "test_color.jpg")
    
    test_img = Image.new("RGB", (100, 100), color=(200, 100, 50))
    for x in range(100):
        for y in range(100):
            r = 255 if x < 50 else 0
            g = 255 if y < 50 else 0
            b = 128
            test_img.putpixel((x, y), (r, g, b))
    test_img.save(test_img_path)
    
    result_path = model.enhance(test_img_path, scale=2)
    
    assert os.path.exists(result_path), "结果文件不存在"
    
    result_img = Image.open(result_path)
    result_data = np.array(result_img)
    
    assert result_data.shape[0] >= 200, "输出尺寸错误"
    assert result_data.shape[1] >= 200, "输出尺寸错误"
    
    mean_r = result_data[:, :, 0].mean()
    mean_g = result_data[:, :, 1].mean()
    mean_b = result_data[:, :, 2].mean()
    
    print(f"   输出图像尺寸: {result_img.size}")
    print(f"   通道均值 - R: {mean_r:.1f}, G: {mean_g:.1f}, B: {mean_b:.1f}")
    
    assert mean_r > 50 and mean_r < 200, "红色通道异常"
    assert mean_g > 50 and mean_g < 200, "绿色通道异常"
    assert mean_b > 50 and mean_b < 200, "蓝色通道异常"
    
    print("   ✅ 颜色通道修复验证通过 - 图像不会空白")
    
    os.remove(test_img_path)
    if os.path.exists(result_path):
        os.remove(result_path)
    
except Exception as e:
    print(f"   ❌ 颜色通道修复测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n2. 测试文件保存路径修复（下载空白问题）...")
try:
    from models.esrgan import ESRGAN
    
    device = torch.device("cpu")
    model = ESRGAN(device=device)
    
    test_img_path = os.path.join(os.path.dirname(__file__), "uploads", "test_save.jpg")
    os.makedirs(os.path.dirname(test_img_path), exist_ok=True)
    
    test_img = Image.new("RGB", (80, 80), color=(100, 150, 200))
    test_img.save(test_img_path)
    
    result_path = model.enhance(test_img_path, scale=4)
    
    print(f"   结果文件路径: {result_path}")
    assert os.path.exists(result_path), "结果文件不存在"
    
    file_size = os.path.getsize(result_path)
    print(f"   文件大小: {file_size} bytes")
    assert file_size > 1000, "文件太小，可能是空的"
    
    result_img = Image.open(result_path)
    result_img.verify()
    print("   ✅ 图像文件完整性验证通过")
    
    assert "results" in result_path, "文件没有保存到results目录"
    
    expected_dir = os.path.join(os.path.dirname(__file__), "results")
    assert result_path.startswith(expected_dir), "文件路径不正确"
    
    print("   ✅ 文件保存路径修复验证通过")
    
    os.remove(test_img_path)
    os.remove(result_path)
    
except Exception as e:
    print(f"   ❌ 文件保存路径修复测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3. 测试进度条平滑更新...")
try:
    from task_queue import TaskQueue, Task, TaskStatus
    import app
    import threading
    import time
    
    queue = TaskQueue(max_concurrent=1)
    
    progress_values = []
    
    def test_task = Task(
        task_id="test_progress",
        filename="test.jpg",
        model_type="esrgan",
        scale=2
    )
    test_task.original_path = test_img_path if 'test_img_path' in locals() and os.path.join(os.path.dirname(__file__), "uploads", "test_save.jpg")
    
    if not os.path.exists(test_task.original_path):
        test_img = Image.new("RGB", (80, 80), color=(100, 150, 200))
        test_img.save(test_task.original_path)
    
    queue.add_task(test_task)
    
    progress_history = []
    
    def monitor_progress():
        for _ in range(30):
            task = queue.get_task("test_progress")
            if task:
                progress_history.append(task.progress)
                print(f"     进度: {task.progress}%", end="\r")
            time.sleep(0.2)
    
    monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
    monitor_thread.start()
    
    next_task = queue.get_next_task()
    if next_task:
        app.process_task(next_task)
    
    monitor_thread.join(timeout=10)
    
    print(f"\n   进度历史: {progress_history}")
    
    progress_changes = len(set(progress_history))
    print(f"   不同进度值数量: {progress_changes}")
    assert progress_changes >= 5, "进度变化太少，不够平滑"
    
    max_progress = max(progress_history) if progress_history else 0
    print(f"   最大进度: {max_progress}%")
    
    has_mid_progress = any(35 < p < 80 for p in progress_history)
    print(f"   包含中间进度(35-80): {has_mid_progress}")
    
    os.remove(test_task.original_path)
    result_task = queue.get_task("test_progress")
    if result_task and result_task.result_path and os.path.exists(result_task.result_path):
        os.remove(result_task.result_path)
    
    print("   ✅ 进度条平滑更新验证通过")
    
except Exception as e:
    print(f"   ❌ 进度条修复测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 所有三个问题的修复都已验证通过！")
print("=" * 60)
print("\n修复总结:")
print("  1. 对比图中原图空白: 修复了BGR/RGB通道转换错误")
print("  2. 下载文件空白: 修复了文件保存路径和格式")
print("  3. 进度条跳变: 添加了平滑进度更新和动画效果")
print("\n可以启动服务进行最终验证: python app.py")
