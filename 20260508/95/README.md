# Video Intelligence Summary System

一个基于 FFmpeg + AI 图像描述的视频智能摘要系统。

## 功能特性

- 📹 **视频上传**: 支持拖拽上传本地视频文件
- ▶️ **YouTube 链接**: 支持输入 YouTube 视频链接
- ⚡ **FFmpeg 抽帧**: 自动提取视频关键帧
- 🤖 **AI 描述**: 智能生成图像描述（模拟）
- 📊 **时间轴展示**: 按时间轴展示摘要卡片
- 📄 **报告下载**: 支持 JSON 和 PDF 格式
- 🔄 **实时进度**: 轮询显示处理进度
- 🎨 **响应式设计**: 精美的 UI 设计

## 技术栈

### 后端
- Node.js + Express
- FFmpeg (fluent-ffmpeg)
- Multer (文件上传)
- PDFKit (PDF生成)
- UUID

### 前端
- React 18 + Vite
- Axios
- 纯 CSS 样式

## 项目结构

```
.
├── backend/
│   ├── server.js              # 后端服务器
│   ├── services/
│   │   ├── videoProcessor.js   # 视频处理服务
│   │   ├── imageCaptioner.js  # 图像描述服务
│   │   └── reportGenerator.js # 报告生成服务
│   ├── uploads/              # 上传文件目录
│   ├── frames/               # 抽帧目录
│   ├── reports/             # 报告目录
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # 主应用组件
│   │   ├── main.jsx        # 入口文件
│   │   └── styles.css      # 样式文件
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 前置要求

1. **Node.js**: 需要安装 Node.js 16+
2. **FFmpeg**: 需要安装 FFmpeg 并配置到环境变量 PATH 中

## 安装运行

### 1. 安装 FFmpeg

**Windows**:
- 下载 FFmpeg: https://ffmpeg.org/download.html
- 解压后将 bin 目录添加到系统环境变量 PATH
- 验证: `ffmpeg -version`

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动后端服务

```bash
cd backend
npm start
```

后端运行在 http://localhost:3001

### 5. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端运行在 http://localhost:3000

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传视频文件 |
| `/api/youtube` | POST | 处理 YouTube 链接 |
| `/api/status/:taskId` | GET | 获取任务状态 |
| `/api/report/:taskId/json` | GET | 下载 JSON 报告 |
| `/api/report/:taskId/pdf` | GET | 下载 PDF 报告 |

## 使用说明

1. 打开浏览器访问 http://localhost:3000
2. 选择上传方式：
   - **上传视频**: 拖拽或点击选择本地视频文件
   - **YouTube 链接**: 粘贴 YouTube 视频 URL
3. 等待处理完成（查看进度条）
4. 查看时间轴摘要
5. 下载 JSON 或 PDF 报告

## 注意事项

- 图像描述目前为模拟数据，实际使用时需接入真实的 AI 模型（如 BLIP、CLIP 等）
- YouTube 下载功能需要额外配置 ytdl-core
- 大文件上传可通过 multer 配置限制
- FFmpeg 路径如果不在 PATH 中，需在 videoProcessor.js 中配置：
  ```javascript
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath('path/to/ffmpeg.exe');
  ffmpeg.setFfprobePath('path/to/ffprobe.exe');
  ```
