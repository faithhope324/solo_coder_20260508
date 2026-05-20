@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================================
echo    Real-time Audio Separation System - Startup
echo ========================================================
echo.

echo [Step 1/6] Checking Python environment...
where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Python not found!
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Python version: %PYVER%

echo.
echo [Step 2/6] Checking pip...
python -m pip --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] pip not found!
    echo Installing pip...
    python -m ensurepip --default-pip
    if errorlevel 1 (
        echo [ERROR] Failed to install pip
        pause
        exit /b 1
    )
)
for /f "tokens=2" %%i in ('python -m pip --version 2^>^&1') do set PIPVER=%%i
echo [OK] pip version: %PIPVER%

echo.
echo [Step 3/6] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip, continuing...
)

echo.
echo [Step 4/6] Installing dependencies (this may take several minutes)...
echo.
echo Trying primary installation method...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [WARNING] Primary installation failed.
    echo Trying with --no-cache-dir flag...
    python -m pip install --no-cache-dir -r requirements.txt
    if errorlevel 1 (
        echo.
        echo [WARNING] Still failing. Trying with increased timeout...
        python -m pip install --default-timeout=120 -r requirements.txt
        if errorlevel 1 (
            echo.
            echo ========================================================
            echo [ERROR] Failed to install dependencies!
            echo ========================================================
            echo.
            echo Possible solutions:
            echo.
            echo 1. Check your internet connection
            echo 2. Try using a Chinese mirror:
            echo    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
            echo.
            echo 3. Install Microsoft Visual C++ Build Tools:
            echo    https://visualstudio.microsoft.com/visual-cpp-build-tools/
            echo.
            echo 4. Check if Python version is 3.8 - 3.11
            echo.
            echo 5. Try installing packages one by one:
            echo    pip install fastapi uvicorn python-multipart
            echo    pip install numpy soundfile aiofiles
            echo    pip install torch torchaudio
            echo    pip install demucs
            echo.
            pause
            exit /b 1
        )
    )
)

echo.
echo [OK] Dependencies installed successfully!

echo.
echo [Step 5/6] Checking ffmpeg (required for audio processing)...
where ffmpeg >nul 2>nul
if errorlevel 1 (
    echo.
    echo [WARNING] ffmpeg not found!
    echo Demucs requires ffmpeg to process audio files.
    echo.
    echo To install ffmpeg:
    echo 1. Download from: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Extract to a folder (e.g., C:\ffmpeg)
    echo 3. Add C:\ffmpeg\bin to your PATH environment variable
    echo.
    echo Or install via Chocolatey:
    echo    choco install ffmpeg
    echo.
    echo Continuing without ffmpeg - some audio formats may fail.
    echo.
) else (
    for /f "tokens=3" %%i in ('ffmpeg -version 2^>^&1 ^| findstr /c:"ffmpeg version"') do set FFMPEGVER=%%i
    echo [OK] ffmpeg version: %FFMPEGVER%
)

echo.
echo [Step 6/6] Starting server...
echo.
echo ========================================================
echo    Server is starting...
echo ========================================================
echo.
echo API Base URL:      http://localhost:8000
echo Web Interface:     http://localhost:8000/frontend/index.html
echo API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server.
echo ========================================================
echo.

cd backend
python main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start!
    echo.
    echo Common issues:
    echo 1. Port 8000 is already in use
    echo 2. PyTorch/CUDA compatibility issues
    echo 3. Missing ffmpeg for audio processing
    echo.
    pause
)

endlocal
