@echo off
echo ========================================
echo   图像超分辨率批处理系统
echo ========================================
echo.
echo 正在启动服务...
echo 服务地址: http://localhost:8000
echo 前端页面: http://localhost:8000/frontend/
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

cd /d "%~dp0"
python -c "import uvicorn; import app; uvicorn.run(app.app, host='0.0.0.0', port=8000, log_level='info')"

pause
