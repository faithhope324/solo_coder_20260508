#!/usr/bin/env python
"""
环境诊断工具 - 检查运行实时语音分离系统所需的所有依赖
"""
import sys
import os
import subprocess
from pathlib import Path


def check_python():
    print("=" * 60)
    print("1. 检查 Python 环境")
    print("=" * 60)
    version = sys.version_info
    print(f"Python 版本: {version.major}.{version.minor}.{version.micro}")

    if version.major == 3 and 8 <= version.minor <= 11:
        print("✅ Python 版本兼容 (3.8 - 3.11)")
        return True
    elif version.major == 3 and version.minor >= 12:
        print("⚠️  Python 3.12+ 可能与某些包不兼容，建议使用 3.11")
        return True
    else:
        print("❌ Python 版本过低，请升级到 3.8+")
        return False


def check_pip():
    print("\n" + "=" * 60)
    print("2. 检查 pip")
    print("=" * 60)
    try:
        result = subprocess.run([sys.executable, "-m", "pip", "--version"],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {result.stdout.strip()}")
            return True
        else:
            print("❌ pip 不可用")
            return False
    except Exception as e:
        print(f"❌ 无法检查 pip: {e}")
        return False


def check_ffmpeg():
    print("\n" + "=" * 60)
    print("3. 检查 ffmpeg")
    print("=" * 60)
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ {version_line}")
            return True
        else:
            print("⚠️  ffmpeg 未找到")
            print("   安装方法:")
            print("   - 下载: https://www.gyan.dev/ffmpeg/builds/")
            print("   - 解压后将 bin 目录添加到 PATH")
            print("   - 或使用 Chocolatey: choco install ffmpeg")
            return False
    except FileNotFoundError:
        print("⚠️  ffmpeg 未安装（处理 MP3 等格式需要）")
        return False
    except Exception as e:
        print(f"❌ 检查 ffmpeg 时出错: {e}")
        return False


def check_imports():
    print("\n" + "=" * 60)
    print("4. 检查 Python 包安装情况")
    print("=" * 60)

    packages = {
        "fastapi": "FastAPI Web 框架",
        "uvicorn": "ASGI 服务器",
        "numpy": "数值计算库",
        "soundfile": "音频文件处理",
        "torch": "PyTorch 深度学习框架",
        "torchaudio": "PyTorch 音频处理",
        "demucs": "Facebook 音频分离模型",
        "aiofiles": "异步文件处理",
        "multipart": "表单数据处理",
    }

    all_ok = True
    for pkg, desc in packages.items():
        try:
            if pkg == "multipart":
                __import__("multipart")
            else:
                __import__(pkg)
            print(f"✅ {pkg:<15} - {desc}")
        except ImportError:
            print(f"❌ {pkg:<15} - 未安装 ({desc})")
            all_ok = False

    return all_ok


def check_torch_cuda():
    print("\n" + "=" * 60)
    print("5. 检查 PyTorch CUDA 支持")
    print("=" * 60)
    try:
        import torch
        print(f"PyTorch 版本: {torch.__version__}")
        if torch.cuda.is_available():
            print(f"✅ CUDA 可用: {torch.cuda.get_device_name(0)}")
            print(f"   CUDA 版本: {torch.version.cuda}")
            return True
        else:
            print("⚠️  CUDA 不可用，将使用 CPU（速度较慢）")
            print("   如需 GPU 加速，请安装 CUDA 版本的 PyTorch:")
            print("   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118")
            return False
    except ImportError:
        print("❌ PyTorch 未安装")
        return False


def check_disk_space():
    print("\n" + "=" * 60)
    print("6. 检查磁盘空间")
    print("=" * 60)
    try:
        disk = Path(__file__).resolve().drive
        if not disk:
            disk = "/"
        usage = shutil.disk_usage(disk)
        free_gb = usage.free / (1024 ** 3)
        print(f"可用空间: {free_gb:.1f} GB")
        if free_gb > 5:
            print("✅ 磁盘空间充足")
            return True
        else:
            print("⚠️  磁盘空间不足（建议至少 5GB）")
            return False
    except Exception as e:
        print(f"❌ 无法检查磁盘空间: {e}")
        return True


def check_network():
    print("\n" + "=" * 60)
    print("7. 检查网络连接")
    print("=" * 60)
    try:
        import urllib.request
        urls = [
            ("https://pypi.org", "PyPI 官方源"),
            ("https://pypi.tuna.tsinghua.edu.cn", "清华镜像源"),
        ]
        for url, name in urls:
            try:
                req = urllib.request.Request(url, method='HEAD')
                urllib.request.urlopen(req, timeout=5)
                print(f"✅ {name}: 可访问")
            except Exception as e:
                print(f"⚠️  {name}: 无法访问 ({e})")
        return True
    except Exception as e:
        print(f"❌ 网络检查失败: {e}")
        return False


def main():
    print("\n" + "♪" * 60)
    print("  实时语音分离系统 - 环境诊断工具")
    print("♪" * 60)

    results = []
    results.append(check_python())
    results.append(check_pip())
    results.append(check_ffmpeg())
    results.append(check_imports())
    results.append(check_torch_cuda())
    results.append(check_disk_space())
    results.append(check_network())

    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)

    passed = sum(results)
    total = len(results)
    print(f"通过检查: {passed}/{total}")

    if passed >= 5:
        print("\n✅ 环境基本就绪，可以启动系统！")
        print("\n启动命令:")
        print("  cd backend")
        print("  python main.py")
        print("\n或直接双击 start.bat (国内用户建议 start_cn.bat)")
    elif passed >= 3:
        print("\n⚠️  部分检查未通过，可能影响使用")
        print("请根据上面的提示安装缺失的依赖")
    else:
        print("\n❌ 环境问题较多，请先解决上述问题")

    print("\n" + "=" * 60)
    return 0 if passed >= 4 else 1


if __name__ == "__main__":
    import shutil
    sys.exit(main())
