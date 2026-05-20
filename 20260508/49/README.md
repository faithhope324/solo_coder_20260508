# 实时语音分离系统

基于 Demucs 模型的实时音频分离 Web 应用，支持将混合音频分离为不同的声源（人声、鼓、贝斯、其他等）。

## 功能特性

- 🎤 **实时录制**：使用麦克风直接录制多人混合音频
- 📁 **文件上传**：支持上传 WAV、MP3、FLAC、OGG、M4A 等格式的音频文件
- 🎵 **声源分离**：使用 Facebook Demucs 模型进行高质量音频分离
- 📊 **多轨道波形**：使用 wavesurfer.js 显示分离后的每个音轨波形图
- ▶️ **独立播放控制**：每个音轨支持独立播放、暂停、静音
- 🔊 **音量调节**：每个音轨支持独立音量控制
- ⬇️ **批量下载**：支持单轨下载和全部批量下载
- 📈 **实时进度**：WebSocket 实时显示分离进度
- ⚡ **分段处理**：长音频自动分段处理，降低内存占用

## 技术栈

### 后端
- **FastAPI**：高性能 Python Web 框架
- **Demucs**：Facebook 开源的音频分离模型（使用 htdemucs 预训练模型）
- **PyTorch**：深度学习框架
- **WebSocket**：实时进度推送

### 前端
- **原生 JavaScript**：无框架依赖
- **wavesurfer.js**：音频波形可视化
- **MediaRecorder API**：浏览器音频录制

## 项目结构

```
project/
├── backend/
│   ├── main.py          # FastAPI 主应用，包含所有 API 端点
│   └── separator.py     # Demucs 模型封装，音频分离核心逻辑
├── frontend/
│   ├── index.html       # 主页面
│   ├── styles.css       # 样式文件
│   └── app.js           # 前端交互逻辑
├── uploads/             # 上传文件临时存储
├── outputs/             # 分离结果输出
├── requirements.txt     # Python 依赖
├── start.bat            # Windows 启动脚本
└── README.md
```

## 快速开始

### 环境要求
- Python 3.8+
- 至少 4GB 内存（推荐 8GB+）
- 支持 CUDA 的 GPU 可大幅加速分离过程（可选）

### 安装与运行

#### Windows 系统
1. 双击运行 `start.bat`
2. 等待依赖安装完成
3. 浏览器自动打开或手动访问 `http://localhost:8000/frontend/index.html`

#### 手动安装
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动后端服务
cd backend
python main.py
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查，返回模型信息 |
| POST | `/api/upload` | 上传音频文件 |
| POST | `/api/separate/{task_id}` | 开始分离任务 |
| GET | `/api/tasks/{task_id}` | 查询任务状态 |
| WebSocket | `/ws/progress/{task_id}` | 实时进度推送 |
| GET | `/api/download/{task_id}/{source}` | 下载分离后的音轨 |
| GET | `/api/audio/{task_id}/{source}` | 流式播放音轨 |
| DELETE | `/api/tasks/{task_id}` | 删除任务和相关文件 |

## 使用说明

### 1. 选择输入方式
- **上传文件**：点击上传区域或拖拽音频文件
- **实时录制**：切换到"实时录制"标签，点击开始录制按钮

### 2. 开始分离
- 调整分段时长（默认 10 秒，长音频建议使用较小值）
- 点击"开始分离"按钮

### 3. 查看结果
- 等待分离完成，每个分离出的声源会显示独立的波形图
- 使用播放/暂停按钮控制单个音轨
- 使用静音按钮临时关闭某个音轨
- 拖动音量滑块调节音量
- 使用底部全局控制按钮批量操作

### 4. 下载结果
- 点击单个音轨的下载按钮下载该音轨
- 点击"下载全部"按钮批量下载所有音轨

## 模型说明

系统默认使用 **htdemucs** 模型，这是 Demucs 的混合版本，结合了波形域和频谱域的优点，分离效果最佳。

分离出的声源包括：
- **drums**（鼓）
- **bass**（贝斯）
- **other**（其他乐器）
- **vocals**（人声）

### 切换模型

在 `backend/separator.py` 中修改：
```python
def __init__(self, model_name: str = "htdemucs", ...):
```

可选模型：
- `htdemucs`：混合 Transformer 模型，效果最佳
- `hdemucs_mmi`：多层 Demucs，质量更好但更慢
- `mdx`：基于 U-Net 的模型
- `mdx_extra`：MDX 的扩展版本

## 性能优化

### GPU 加速
如果安装了 CUDA 版本的 PyTorch，系统会自动使用 GPU：
```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 分段处理
- 较长的音频会自动分成多个片段处理
- 可以在前端调整分段时长（5-60 秒）
- 较小的分段值会减少内存占用，但可能略微影响分离质量

## 注意事项

1. 首次运行时会自动下载预训练模型（约 80MB），需要联网
2. 音频分离是计算密集型任务，处理时间取决于音频长度和硬件性能
3. 分离结果仅供个人学习和研究使用
4. 请确保有权处理上传的音频内容

## 常见问题

**Q: 模型下载失败怎么办？**
A: 可以手动从 Hugging Face 下载模型放到缓存目录，或使用国内镜像源。

**Q: 为什么分离后的音频有重叠？**
A: 分段处理时使用了 25% 的重叠来减少接缝效应，这是正常现象。

**Q: 可以同时处理多个任务吗？**
A: 当前版本设计为单任务处理，如需多任务可以修改代码添加任务队列。

## License

MIT License
