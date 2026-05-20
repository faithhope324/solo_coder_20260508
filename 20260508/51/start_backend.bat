@echo off
echo ========================================
echo 游戏玩家流失预测系统 - 后端启动
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] 检查 Python 环境...
python --version
if errorlevel 1 (
    echo 错误: 未检测到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)

echo.
echo [2/3] 安装依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo 警告: 依赖安装可能出现问题，尝试继续...
)

echo.
echo [3/3] 启动后端服务...
echo 服务将在 http://localhost:5000 启动
echo 按 Ctrl+C 停止服务
echo.
python app.py

pause
