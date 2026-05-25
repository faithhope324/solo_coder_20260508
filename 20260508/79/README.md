# 图像超分辨率批处理系统

基于深度学习的图像超分辨率批量处理系统，支持 ESRGAN 和 SwinIR 两种模型，可将低分辨率图像放大 2x 或 4x。

## 功能特性

- 🖼️ **批量上传**: 支持拖拽或点击上传多张图片，支持 JPG、PNG、BMP、WebP 格式
- 🤖 **双模型支持**: ESRGAN（速度快）和 SwinIR（质量优）可选
- 🔍 **多倍放大**: 支持 2x 和 4x 超分辨率放大
- 📋 **任务队列**: 智能任务队列管理，显示实时排队位置
- 📊 **进度追踪**: 实时轮询显示每张图片的处理进度
- 👁️ **前后对比**: 交互式滑块对比原图与超分结果
- 📦 **批量下载**: 一键打包下载所有处理完成的图片为 ZIP
- ⚡ **GPU保护**: 自动限流和 OOM 保护，避免显存溢出
- 🎨 **精美界面**: 响应式设计，支持网格/列表双视图切换

## 技术架构

### 后端
- **Web框架**: FastAPI
- **深度学习**: PyTorch
- **超分模型**: ESRGAN (RRDBNet)、SwinIR
- **任务队列**: 自定义线程安全队列，支持并发限制
- **图像处理**: Pillow + OpenCV

### 前端
- **纯原生实现**: 无框架依赖，加载快速
- **响应式设计**: 支持桌面和移动端
- **实时更新**: 2秒轮询刷新任务状态

## 项目结构

```
79/
├── backend/
│   ├── app.py                 # FastAPI 主应用
│   ├── task_queue.py          # 任务队列系统
│   ├── requirements.txt       # Python 依赖
│   ├── models/
│   │   ├── __init__.py
│   │   ├── esrgan.py          # ESRGAN 模型
│   │   └── swinir.py          # SwinIR 模型
│   ├── uploads/               # 上传图片目录
│   └── results/               # 处理结果目录
├── frontend/
│   ├── index.html             # 主页面
│   ├── css/
│   │   └── style.css          # 样式文件
│   └── js/
│       └── app.js             # 前端逻辑
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

```bash
cd backend
python app.py
```

服务将在 `http://localhost:8000` 启动。

### 3. 访问前端

打开浏览器访问: `http://localhost:8000/frontend/`

## API 接口

### 上传图片
```http
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- files: 图片文件（多个）
- model_type: "esrgan" 或 "swinir"
- scale: 2 或 4

Response: 任务列表
```

### 获取所有任务
```http
GET /api/tasks
Response: 所有任务的详细信息
```

### 获取单个任务
```http
GET /api/tasks/{task_id}
Response: 单个任务的详细信息
```

### 获取队列状态
```http
GET /api/status
Response: { queued, processing, max_concurrent, max_queue_size }
```

### 批量下载
```http
POST /api/download/batch
Content-Type: application/json

Body: ["task_id_1", "task_id_2", ...]
Response: ZIP 文件流
```

### 删除任务
```http
DELETE /api/tasks/{task_id}
Response: { success: true }
```

### 清除已完成任务
```http
DELETE /api/tasks
Response: { removed: count }
```

## 配置说明

### 并发限制
在 `backend/app.py` 中修改:
```python
MAX_CONCURRENT = 1    # 同时处理的任务数（建议GPU环境设为1-2）
MAX_QUEUE_SIZE = 50   # 最大队列长度
```

### 模型参数
在模型文件中可调整:
- `max_size`: 图片最大边长限制（防止OOM）
- 网络深度、通道数等模型结构参数

## OOM 保护机制

系统实现了多层 OOM 保护:

1. **输入限制**: 自动将大图缩放到安全尺寸
   - ESRGAN: 最大边长 800px
   - SwinIR: 最大边长 600px

2. **异常捕获**: 当检测到 CUDA OOM 时:
   - 自动清空 CUDA 缓存
   - 将图片进一步缩小 50%
   - 重试推理

3. **并发限制**: 默认同时只处理 1 个任务

## 使用说明

1. **选择模型和放大倍数**: 在上传区域上方选择
2. **上传图片**: 点击上传区域或拖拽图片到虚线框内
3. **等待处理**: 查看任务卡片上的进度和队列位置
4. **对比效果**: 完成后可在卡片上拖动滑块对比，或点击"对比"按钮放大查看
5. **下载结果**: 勾选需要的图片，点击"下载选中图片(ZIP)"批量下载

## 性能说明

| 模型 | 速度 | 质量 | 显存占用 | 适用场景 |
|------|------|------|----------|----------|
| ESRGAN | ⚡快 | 良好 | 较低 | 批量处理、追求速度 |
| SwinIR | 🐢慢 | 优秀 | 较高 | 追求质量、细节丰富的图片 |

*注: 实际速度取决于 GPU 性能和图片大小*

## 常见问题

**Q: 为什么处理速度很慢？**
A: 超分辨率是计算密集型任务，建议使用 GPU 加速。CPU 处理一张图片可能需要数分钟。

**Q: 如何启用 GPU？**
A: 安装支持 CUDA 的 PyTorch 版本，系统会自动检测并使用 GPU。

**Q: 为什么图片被缩小了？**
A: 为防止显存溢出，系统会自动将大图缩放到安全尺寸。如需处理原图，可修改模型文件中的 `max_size` 参数。

**Q: 可以添加自定义模型吗？**
A: 可以，在 `backend/models/` 目录下添加新的模型类，实现 `enhance()` 方法即可。

## License

MIT
