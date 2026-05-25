@echo off
echo ========================================
echo 启动后端服务 (端口 8000)
echo ========================================
cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
