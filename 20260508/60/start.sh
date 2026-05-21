#!/bin/bash
echo "========================================"
echo "生物序列比对系统 - 启动脚本"
echo "========================================"
echo ""

echo "[1/2] 启动后端服务..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

sleep 3

echo "[2/2] 启动前端服务..."
cd frontend
python3 -m http.server 3000 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "系统启动完成!"
echo "后端API: http://localhost:5000"
echo "前端界面: http://localhost:3000"
echo "========================================"
echo ""
echo "请在浏览器中打开 http://localhost:3000 使用系统"
echo ""
echo "按 Ctrl+C 停止服务"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
