@echo off
echo ========================================================
echo    Install Dependencies for Audio Separation System
echo ========================================================
echo.

echo [1/4] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [WARNING] Failed to upgrade pip
)

echo.
echo [2/4] Installing core dependencies...
python -m pip install fastapi uvicorn[standard] python-multipart numpy soundfile aiofiles
if errorlevel 1 (
    echo [ERROR] Failed to install core dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Installing PyTorch (CPU version)...
echo This may take a while as PyTorch is ~200MB
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install PyTorch CPU version
    echo.
    echo Trying alternative method (from PyPI)...
    python -m pip install torch torchaudio
    if errorlevel 1 (
        echo [ERROR] PyTorch installation failed
        echo Please install manually from https://pytorch.org/
        pause
        exit /b 1
    )
)

echo.
echo [4/4] Installing Demucs...
python -m pip install demucs
if errorlevel 1 (
    echo [ERROR] Failed to install Demucs
    pause
    exit /b 1
)

echo.
echo ========================================================
echo    All dependencies installed successfully!
echo ========================================================
echo.
echo Now you can start the server:
echo   cd backend
echo   python main.py
echo.
pause
