@echo off
echo ========================================
echo   新闻推荐系统可解释性面板
echo ========================================
echo.
echo 正在启动服务器...
echo 服务器地址: http://127.0.0.1:5000
echo.
echo 启动后请在浏览器中打开上面的地址
echo 按 Ctrl+C 可以停止服务器
echo.
echo ========================================
echo.

cd /d "%~dp0"
python run_server.py

pause
