@echo off
echo ========================================
echo  情感分析项目 - 启动脚本
echo ========================================
echo.

echo [1/3] 安装依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo 依赖安装失败，请检查网络连接或pip配置
    pause
    exit /b 1
)
echo 依赖安装完成！
echo.

echo [2/3] 训练模型...
python train.py
if errorlevel 1 (
    echo 模型训练失败
    pause
    exit /b 1
)
echo 模型训练完成！
echo.

echo [3/3] 启动Web应用...
echo 应用将在 http://localhost:5000 启动
echo 按 Ctrl+C 停止服务器
echo.
python app.py
