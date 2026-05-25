@echo off
chcp 65001 >nul
echo ============================================================
echo 文本摘要与关键词提取系统 - 依赖安装脚本
echo ============================================================
echo.

echo [1/2] 安装后端 Python 依赖...
cd /d "%~dp0backend"
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [错误] 后端依赖安装失败，请检查 Python 环境
    pause
    exit /b 1
)
echo [OK] 后端依赖安装完成
echo.

echo [2/2] 安装前端 Node 依赖...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo.
    echo [错误] 前端依赖安装失败，请检查 Node.js 环境
    pause
    exit /b 1
)
echo [OK] 前端依赖安装完成
echo.

echo ============================================================
echo 所有依赖安装完成！
echo 运行 start.bat 启动系统
echo ============================================================
pause
