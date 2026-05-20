@echo off
echo ========================================
echo     图文检索系统 - 构建索引
echo ========================================
echo.

echo 正在构建图片特征索引...
python backend\index_images.py

echo.
echo 索引构建完成！
pause
