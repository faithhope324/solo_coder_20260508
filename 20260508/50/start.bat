@echo off
chcp 65001 >nul
echo ========================================
echo 数据管道血缘关系系统 - 启动脚本
echo ========================================
echo.

echo [1/4] 检查Python环境...
python --version
if %errorlevel% neq 0 (
    echo 错误: 未检测到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo.
echo [2/4] 安装依赖包...
pip install -r requirements.txt

echo.
echo [3/4] 初始化数据库和模拟数据...
cd backend
if not exist "data_lineage.db" (
    python seed_data.py
) else (
    echo 数据库已存在，跳过初始化
)

echo.
echo [4/4] 启动后端服务 (端口: 8000)...
echo 后端API地址: http://localhost:8000
echo 前端页面地址: ../frontend/index.html
echo.
echo 提示: 请使用浏览器打开 frontend/index.html 访问系统
echo 按 Ctrl+C 停止服务
echo ========================================

python main.py
