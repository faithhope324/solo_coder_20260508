@echo off
echo ========================================
echo 交通流量预测系统 - 启动服务器
echo ========================================
echo.
echo 正在启动Flask服务器...
echo 服务器地址: http://127.0.0.1:5000
echo.
cd /d "%~dp0"
python app.py
pause
