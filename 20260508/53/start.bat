@echo off
echo ========================================
echo     图文检索系统 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo.

echo [2/3] 检查依赖是否安装...
python -c "import fastapi, uvicorn, torch, open_clip, faiss, PIL, numpy" 2>nul
if errorlevel 1 (
    echo 正在安装依赖...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 依赖已安装
)
echo.

echo [3/3] 检查索引是否存在...
if not exist "index\faiss.index" (
    echo 未找到索引，正在构建索引...
    python backend\index_images.py
)
echo.

echo 启动服务...
echo 服务地址: http://localhost:8000
echo 按 Ctrl+C 停止服务
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

pause
