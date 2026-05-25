@echo off
chcp 65001 >nul
echo ============================================================
echo 文本摘要与关键词提取系统 - 启动脚本
echo ============================================================
echo.

echo [1/2] 启动后端服务 (端口: 5000)...
start "Backend Server" cmd /k "cd /d %~dp0backend && set PYTHONIOENCODING=utf-8 && python run.py"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务 (端口: 5173)...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo 服务启动中，请稍候...
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:5000
echo ============================================================
echo.
pause
