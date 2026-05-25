# 场景文字识别与翻译系统

一个基于 OCR 和翻译技术的场景文字识别与翻译系统，支持路牌、菜单、标识等图片的文字检测、识别、翻译和可视化标注。

## 功能特性

- 📷 **图片上传**: 支持拖拽或点击上传常见格式图片
- 🔍 **OCR 文字检测**: 使用 PaddleOCR 进行高精度文字区域检测和识别
- 🔄 **智能区域处理**: 自动合并重叠区域，按阅读顺序排序
- 🌐 **多语言翻译**: 支持中、英、日、韩、法、德、西、俄等多语言互译
- 🎨 **可视化标注**: 在原图旁绘制翻译文字，支持多种视图模式
- 📥 **结果导出**: 支持导出标注后的图片
- ⚙️ **灵活配置**: 可调整重叠阈值、显示选项等参数

## 技术架构

### 后端
- **框架**: FastAPI
- **OCR 引擎**: PaddleOCR
- **图像处理**: OpenCV + Pillow
- **翻译服务**: 百度翻译 API (支持 mock 模式)

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **图标**: Lucide React

## 项目结构

```
.
├── backend/                    # 后端服务
│   ├── main.py                # FastAPI 主应用
│   ├── ocr_engine.py          # OCR 文字检测识别模块
│   ├── text_region_processor.py  # 文字区域处理（排序/去重）
│   ├── translator.py          # 翻译模块
│   ├── image_annotator.py     # 图片标注模块
│   ├── requirements.txt       # Python 依赖
│   ├── .env.example           # 环境变量示例
│   └── __init__.py
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── ImageUploader.tsx    # 图片上传组件
│   │   │   ├── ImageViewer.tsx      # 图片查看器
│   │   │   ├── RegionList.tsx       # 文字区域列表
│   │   │   └── OptionsPanel.tsx     # 选项配置面板
│   │   ├── services/
│   │   │   └── api.ts               # API 服务
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript 类型定义
│   │   ├── App.tsx             # 主应用组件
│   │   ├── main.tsx            # 入口文件
│   │   └── index.css           # 全局样式
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
├── start_backend.bat           # 后端启动脚本 (Windows)
├── start_frontend.bat          # 前端启动脚本 (Windows)
└── README.md
```

## 快速开始

### 环境要求

- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置翻译服务（可选）

复制 `.env.example` 为 `.env` 并配置百度翻译 API：

```env
TRANSLATION_PROVIDER=baidu
BAIDU_APP_ID=your_app_id
BAIDU_SECRET_KEY=your_secret_key
```

如果不配置，将使用内置的 mock 翻译（包含常用词汇的翻译字典）。

### 3. 启动后端服务

Windows:
```bash
start_backend.bat
```

或手动执行:
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 http://localhost:8000 启动

### 4. 安装前端依赖

```bash
cd frontend
npm install
```

### 5. 启动前端服务

Windows:
```bash
start_frontend.bat
```

或手动执行:
```bash
cd frontend
npm run dev
```

前端服务将在 http://localhost:3000 启动

## 使用说明

1. 打开浏览器访问 http://localhost:3000
2. 在左侧配置翻译选项（源语言、目标语言等）
3. 拖拽或点击上传包含文字的图片（如路牌、菜单等）
4. 点击"开始处理"按钮
5. 等待处理完成后，查看：
   - 原图与标注图的对比
   - 检测到的文字区域列表
   - 每个区域的原文和译文
6. 使用"导出图片"按钮下载标注后的图片

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/languages` | GET | 获取支持的语言列表 |
| `/api/ocr` | POST | 仅进行 OCR 文字检测 |
| `/api/translate` | POST | 翻译单条文本 |
| `/api/translate_batch` | POST | 批量翻译文本 |
| `/api/process` | POST | 完整处理流程（OCR+翻译+标注） |
| `/api/download_annotated` | POST | 下载标注后的图片 |

## 核心算法

### 文字区域排序
- 基于中心点 y 坐标进行行分组
- 行内按中心点 x 坐标从左到右排序
- 阈值动态调整（图片高度的 5%）

### 重叠区域合并
- 使用 IoU (Intersection over Union) 计算重叠度
- 可配置阈值（默认 0.3）
- 合并时保留置信度最高的文本

### 翻译文字布局
- 优先顺序：右侧 → 左侧 → 下方 → 上方 → 覆盖
- 自动计算字体大小以适应区域
- 半透明背景提高可读性

## 注意事项

1. 首次运行 PaddleOCR 会自动下载模型文件，需要联网
2. 大图片处理可能需要较长时间（5-30秒）
3. 百度翻译 API 有调用频率限制，商用建议申请正式账号
4. 建议使用 Chrome 或 Edge 浏览器以获得最佳体验

## 许可证

MIT License
