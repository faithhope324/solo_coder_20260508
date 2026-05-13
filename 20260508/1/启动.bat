@echo off
echo ========================================
echo   电商销售数据仪表板 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查依赖...
python -c "import flask, pandas, plotly" 2>nul
if errorlevel 1 (
    echo 依赖未安装，正在安装...
    pip install -r requirements.txt
) else (
    echo 依赖已安装 ✓
)

echo.
echo [2/3] 启动Flask服务器...
echo 服务器地址: http://localhost:5000
echo 按 Ctrl+C 停止服务器
echo.

python run.py

echo.
echo 服务器已停止
pause
