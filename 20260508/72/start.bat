@echo off
chcp 65001 >nul
echo ============================================================
echo 地震波传播模拟系统 - 启动脚本
echo ============================================================
echo.

echo [1/3] 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo Python环境检查完成
echo.

echo [2/3] 安装依赖包...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo 警告: 依赖安装可能存在问题，尝试继续运行...
)
echo 依赖安装完成
echo.

echo [3/3] 启动服务...
echo.
echo ============================================================
echo 服务启动成功！
echo 请在浏览器中访问: http://localhost:5000
echo ============================================================
echo.
python run.py

pause
