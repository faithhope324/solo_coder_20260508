@echo off
echo ========================================
echo 粒子对撞模拟系统 - 前端服务器
echo ========================================
echo.

cd /d "%~dp0\frontend"

echo 启动HTTP服务器...
echo 前端地址: http://localhost:8000
echo 按 Ctrl+C 停止服务器
echo.

python -m http.server 8000
