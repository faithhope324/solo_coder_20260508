@echo off
echo ========================================
echo 启动前端服务 (端口 3000)
echo ========================================
cd /d "%~dp0frontend"
call npm install
call npm run dev
pause
