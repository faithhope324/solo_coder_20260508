# 🎯 视频目标跟踪与计数系统

基于 **YOLO + DeepSORT** 的实时视频目标检测、跟踪与计数平台。支持多种目标类别（行人、车辆、自行车等）的检测、跟踪和进出区域计数。

## ✨ 功能特性

- 🎬 **视频上传与播放** - 支持多种视频格式上传和在线播放
- 🔍 **目标检测** - 使用 YOLOv5 进行实时目标检测
- 🚶 **多目标跟踪** - 基于 DeepSORT 算法的稳定目标跟踪
- 📊 **进出计数** - 自定义计数线，统计目标进出区域数量
- 🎨 **可视化叠加** - Canvas 实时绘制 bounding box 和轨迹线
- 🎞️ **逐帧预览** - 支持逐帧浏览和精确分析
- 📥 **CSV 导出** - 导出完整的检测和跟踪结果
- ⚙️ **灵活配置** - 可调整置信度阈值、帧间隔、目标类别等参数

## 🛠️ 技术栈

### 后端
- **FastAPI** - 高性能 Python Web 框架
- **OpenCV** - 视频处理和计算机视觉
- **PyTorch** - YOLOv5 模型推理（可选）
- **NumPy/SciPy** - 数值计算和优化
- **FilterPy** - 卡尔曼滤波实现

### 前端
- 原生 **HTML5/CSS3/JavaScript**
- **Canvas API** - 实时绘制检测框和轨迹
- **Video API** - 视频播放控制

## 📁 项目结构

```
.
├── main.py                      # FastAPI 主应用
├── requirements.txt             # Python 依赖
├── tracker/                     # 跟踪模块
│   ├── __init__.py
│   ├── yolo_detector.py         # YOLO 检测器
│   ├── video_processor.py       # 视频处理器
│   ├── counter.py               # 进出线计数器
│   ├── csv_exporter.py          # CSV 导出器
│   └── deep_sort/               # DeepSORT 跟踪算法
│       ├── __init__.py
│       ├── tracker.py           # 跟踪器主类
│       ├── track.py             # 跟踪对象
│       ├── kalman_filter.py     # 卡尔曼滤波器
│       └── matching.py          # 匈牙利匹配算法
├── static/                      # 前端静态文件
│   ├── index.html               # 主页面
│   ├── style.css                # 样式表
│   └── app.js                   # 前端逻辑
├── uploads/                     # 上传视频存放目录
├── results/                     # 处理结果存放目录
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8000` 启动。

### 3. 使用系统

1. 打开浏览器访问 `http://localhost:8000`
2. 点击上传区域或拖拽视频文件上传
3. 在视频上点击设置计数线（两点确定一条线）
4. 选择要检测的目标类别和参数
5. 点击"开始处理视频"
6. 等待处理完成后，即可查看结果和导出 CSV

## 📡 API 接口

### 上传视频
```
POST /api/upload
Content-Type: multipart/form-data
参数: file (视频文件)
返回: { task_id, message }
```

### 处理视频
```
POST /api/process
Content-Type: multipart/form-data
参数:
  - task_id: 任务ID
  - target_classes: 目标类别 (如: person,car,truck)
  - line_start: 计数线起点 (如: 0.5,0.0)
  - line_end: 计数线终点 (如: 0.5,1.0)
  - confidence_threshold: 置信度阈值 (0.1-0.9)
  - frame_interval: 帧间隔 (1-10)
```

### 获取处理状态
```
GET /api/status?task_id={task_id}
```

### 获取处理结果
```
GET /api/results/{task_id}
```

### 下载 CSV 结果
```
GET /api/download/{task_id}/csv
```

### 获取指定帧
```
GET /api/frame/{task_id}/{frame_number}
```

### 列出所有任务
```
GET /api/tasks
```

### 删除任务
```
DELETE /api/tasks/{task_id}
```

## 📊 结果数据格式

处理结果以 JSON 格式保存，包含以下主要字段：

```json
{
  "task_id": "任务ID",
  "video_info": {
    "width": 视频宽度,
    "height": 视频高度,
    "fps": 帧率,
    "total_frames": 总帧数,
    "duration": 时长(秒)
  },
  "counts": {
    "person": { "in": 进入数, "out": 离开数, "total": 总数 },
    "car": { ... }
  },
  "total_counts": { "in": 总进入, "out": 总离开, "total": 总计 },
  "frames": [
    {
      "frame_number": 帧号,
      "timestamp": 时间戳,
      "detections": [
        {
          "track_id": 跟踪ID,
          "bbox": [x1, y1, x2, y2],
          "class_name": 类别,
          "confidence": 置信度,
          "trajectory": 轨迹点数组
        }
      ]
    }
  ],
  "tracks": {
    "track_id": {
      "track_id": 跟踪ID,
      "class_name": 类别,
      "start_frame": 出现帧,
      "end_frame": 消失帧,
      "trajectory": 完整轨迹,
      "bbox_history": 边界框历史
    }
  }
}
```

## 🎨 目标类别与颜色映射

| 类别 | 颜色 | 说明 |
|------|------|------|
| person | 🔴 #FF6B6B | 行人 |
| car | 🔵 #4ECDC4 | 小汽车 |
| truck | 🔷 #45B7D1 | 卡车 |
| bicycle | 🟢 #96CEB4 | 自行车 |
| motorcycle | 🟡 #FFEAA7 | 摩托车 |
| bus | 🟣 #DDA0DD | 公交车 |

## ⚠️ 注意事项

1. **模型加载**: 系统会自动尝试加载 PyTorch YOLOv5 模型。如果未安装 PyTorch，会降级使用 OpenCV DNN 或背景减除方法。
2. **性能**: 视频处理速度取决于计算机性能和视频分辨率。建议使用 GPU 加速。
3. **存储**: 上传的视频和处理结果会保存在 `uploads/` 和 `results/` 目录中，注意定期清理。
4. **浏览器兼容性**: 建议使用 Chrome、Firefox 或 Edge 等现代浏览器。

## 🔧 故障排除

### 问题: 模型加载失败
- 确保已安装 PyTorch: `pip install torch torchvision`
- 或手动下载 YOLOv3 权重文件放到项目根目录

### 问题: 视频无法播放
- 检查视频格式是否受支持（MP4, WebM 等）
- 确保浏览器支持相应的视频编码

### 问题: 处理速度很慢
- 增大 `frame_interval` 参数跳帧处理
- 降低视频分辨率
- 使用 GPU 加速的 PyTorch 版本

## 📝 License

MIT License
