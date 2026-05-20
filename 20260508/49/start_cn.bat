@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================================
echo    实时语音分离系统 - 国内镜像加速启动
echo ========================================================
echo.
echo 使用清华大学镜像源加速下载
echo.

set MIRROR=https://pypi.tuna.tsinghua.edu.cn/simple
set TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

echo [Step 1/6] 检查 Python 环境...
where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo [错误] 未找到 Python！
    echo 请安装 Python 3.8+ 版本: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Python 版本: %PYVER%

echo.
echo [Step 2/6] 检查 pip...
python -m pip --version >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 pip!
    echo 正在安装 pip...
    python -m ensurepip --default-pip
    if errorlevel 1 (
        echo [错误] pip 安装失败
        pause
        exit /b 1
    )
)
for /f "tokens=2" %%i in ('python -m pip --version 2^>^&1') do set PIPVER=%%i
echo [OK] pip 版本: %PIPVER%

echo.
echo [Step 3/6] 升级 pip (使用镜像源)...
python -m pip install --upgrade pip -i %MIRROR% --trusted-host %TRUSTED_HOST%
if errorlevel 1 (
    echo [警告] pip 升级失败，继续...
)

echo.
echo [Step 4/6] 安装依赖包 (使用清华镜像源，可能需要几分钟)...
echo.
python -m pip install -r requirements.txt -i %MIRROR% --trusted-host %TRUSTED_HOST% --default-timeout=120
if errorlevel 1 (
    echo.
    echo [警告] 批量安装失败，尝试逐个安装...
    echo.

    echo 正在安装 fastapi...
    python -m pip install "fastapi>=0.100.0,<0.116.0" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo 正在安装 uvicorn...
    python -m pip install "uvicorn[standard]>=0.20.0,<0.31.0" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo 正在安装 python-multipart...
    python -m pip install "python-multipart>=0.0.6,<0.0.13" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo 正在安装 numpy...
    python -m pip install "numpy>=1.24.0,<1.27.0" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo 正在安装 soundfile...
    python -m pip install "soundfile>=0.12.0,<0.13.0" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo 正在安装 aiofiles...
    python -m pip install "aiofiles>=23.0.0,<25.0.0" -i %MIRROR% --trusted-host %TRUSTED_HOST%

    echo.
    echo [重要] 现在安装 PyTorch 和 Demucs (较大的包，可能需要更长时间)...
    echo.

    echo 正在安装 torch 和 torchaudio...
    python -m pip install "torch>=2.0.0,<2.5.0" "torchaudio>=2.0.0,<2.5.0" -i %MIRROR% --trusted-host %TRUSTED_HOST% --default-timeout=300
    if errorlevel 1 (
        echo.
        echo [错误] PyTorch 安装失败！
        echo 请尝试手动安装 CPU 版本:
        echo pip install torch torch torchaudio --index-url https://download.pytorch.org/whl/cpu
        echo.
        echo 或从官网下载: https://pytorch.org/
        echo.
        pause
        exit /b 1
    )

    echo 正在安装 demucs...
    python -m pip install "demucs>=4.0.0,<4.1.0" -i %MIRROR% --trusted-host %TRUSTED_HOST% --default-timeout=300
    if errorlevel 1 (
        echo.
        echo [错误] Demucs 安装失败！
        echo 请检查网络连接或使用科学上网。
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [OK] 依赖安装成功！

echo.
echo [Step 5/6] 检查 ffmpeg (音频处理必需)...
where ffmpeg >nul 2>nul
if errorlevel 1 (
    echo.
    echo [警告] 未找到 ffmpeg！
    echo Demucs 需要 ffmpeg 来处理音频文件。
    echo.
    echo 安装 ffmpeg 的方法:
    echo 1. 下载: https://www.gyan.dev/ffmpeg/builds/
    echo 2. 解压到文件夹 (例如 C:\ffmpeg)
    echo 3. 将 C:\ffmpeg\bin 添加到系统 PATH 环境变量
    echo.
    echo 或使用 Chocolatey 安装:
    echo    choco install ffmpeg
    echo.
    echo 继续启动，但部分音频格式可能无法处理。
    echo.
) else (
    for /f "tokens=3" %%i in ('ffmpeg -version 2^>^&1 ^| findstr /c:"ffmpeg version"') do set FFMPEGVER=%%i
    echo [OK] ffmpeg 版本: %FFMPEGVER%
)

echo.
echo [Step 6/6] 启动服务器...
echo.
echo ========================================================
echo    服务器启动中...
echo ========================================================
echo.
echo 接口地址:    http://localhost:8000
echo 网页界面:    http://localhost:8000/frontend/index.html
echo 接口文档:    http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================================
echo.

cd backend
python main.py

if errorlevel 1 (
    echo.
    echo [错误] 服务器启动失败！
    echo.
    echo 常见问题:
    echo 1. 端口 8000 被占用
    echo 2. PyTorch/CUDA 版本不兼容
    echo 3. 缺少 ffmpeg
    echo.
    pause
)

endlocal
