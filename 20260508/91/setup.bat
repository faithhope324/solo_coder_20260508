@echo off
echo ========================================
echo    量子电路模拟器 - 启动脚本
echo ========================================
echo.

echo [1/2] 安装后端依赖...
cd backend
pip install -r requirements.txt
echo 后端依赖安装完成!
echo.

echo [2/2] 安装前端依赖...
cd ..\frontend
call npm install
echo 前端依赖安装完成!
echo.

echo ========================================
echo    依赖安装完成!
echo    请分别在两个终端运行:
echo.
echo    后端: cd backend ^&^& python main.py
echo    前端: cd frontend ^&^& npm run dev
echo ========================================
pause