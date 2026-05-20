@echo off
echo ========================================
echo 粒子对撞模拟系统 - 后端服务器
echo ========================================
echo.

cd /d "%~dp0"

echo 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo.
echo 安装依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo 警告: 依赖安装可能失败，请手动运行: pip install -r requirements.txt
)

echo.
echo 启动Flask服务器...
echo 服务器地址: http://localhost:5000
echo 按 Ctrl+C 停止服务器
echo.

cd backend
python app.py
