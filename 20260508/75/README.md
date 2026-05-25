# 文本摘要与关键词提取系统

基于深度学习的智能文本分析系统，支持 PDF 解析、多模型摘要生成、关键词提取与可视化。

## 功能特性

- 📝 **文本输入**：支持直接粘贴长文本或上传 PDF 文件
- 🤖 **智能摘要**：集成 BART 和 T5 两种深度学习模型，支持多标签页对比
- 🔍 **关键词提取**：RAKE 和 TF-IDF 两种算法可选
- ☁️ **关键词云**：可视化展示关键词权重，点击高亮原文
- 📄 **PDF 解析**：自动提取 PDF 文本内容，保留段落结构
- 🎨 **精美界面**：现代化深色主题，玻璃态设计风格

## 技术栈

### 前端
- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS 3** 样式框架
- **Zustand** 状态管理
- **Axios** HTTP 客户端
- **Lucide React** 图标库

### 后端
- **Flask 3.x** Web 框架
- **PyPDF2** + **pdfplumber** PDF 解析
- **HuggingFace Transformers** 深度学习模型 (BART, T5)
- **scikit-learn** TF-IDF 算法
- **NLTK** 自然语言处理工具

## 项目结构

```
.
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── TextInput.tsx
│   │   │   ├── PDFUpload.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── SummaryTabs.tsx
│   │   │   ├── KeywordCloud.tsx
│   │   │   └── HighlightedText.tsx
│   │   ├── services/        # API 服务
│   │   ├── store/           # 状态管理
│   │   ├── types/           # 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── backend/                 # 后端项目
│   ├── app/
│   │   ├── services/        # 核心服务
│   │   │   ├── pdf_parser.py
│   │   │   ├── summarizer.py
│   │   │   └── keyword_extractor.py
│   │   ├── utils/           # 工具函数
│   │   │   └── text_processor.py
│   │   ├── __init__.py
│   │   └── routes.py        # API 路由
│   ├── requirements.txt
│   └── run.py
│
└── README.md
```

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 推荐使用虚拟环境

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

> **注意**：首次运行时，transformers 库会自动下载 BART 和 T5 模型（约 1.5GB），请确保网络畅通。
> 如果没有安装 transformers，系统会自动回退到启发式摘要算法。

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端服务

```bash
cd backend
python run.py
```

后端服务将在 http://localhost:5000 启动

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端服务将在 http://localhost:5173 启动

### 5. 访问应用

打开浏览器访问 http://localhost:5173

## API 接口

### `POST /api/upload`
上传并解析 PDF 文件

**请求**: `multipart/form-data`
- `file`: PDF 文件

**响应**:
```json
{
  "success": true,
  "text": "提取的文本内容...",
  "pageCount": 10,
  "fileName": "document.pdf"
}
```

### `POST /api/summarize`
生成文本摘要

**请求**:
```json
{
  "text": "需要摘要的文本...",
  "models": ["bart", "t5"],
  "summaryLength": "medium"
}
```

### `POST /api/keywords`
提取关键词

**请求**:
```json
{
  "text": "需要提取关键词的文本...",
  "algorithm": "rake",
  "maxKeywords": 20
}
```

### `POST /api/analyze`
完整分析（摘要 + 关键词）

**请求**:
```json
{
  "text": "需要分析的文本...",
  "summaryModels": ["bart", "t5"],
  "keywordAlgorithm": "rake",
  "summaryLength": "medium",
  "maxKeywords": 20
}
```

### `GET /api/models`
获取可用模型信息

### `GET /api/health`
健康检查

## 使用说明

1. **输入文本**：
   - 在左侧文本框直接粘贴或输入长文本
   - 或点击"加载示例文本"快速体验
   - 或在右侧上传 PDF 文件

2. **选择模型**：
   - 摘要模型：可多选 BART 和/或 T5
   - 关键词算法：RAKE 或 TF-IDF
   - 摘要长度：简短/中等/详细
   - 关键词数量：5-50 个

3. **开始分析**：
   - 点击"开始分析"按钮
   - 等待处理完成（深度学习模型首次运行需要下载）

4. **查看结果**：
   - 在"分析结果"标签页查看
   - 多标签页切换对比不同模型的摘要
   - 点击关键词云中的词语，原文中对应位置会高亮并滚动定位

## 模型说明

### BART (facebook/bart-large-cnn)
- 双向自回归转换器模型
- 由 Facebook 开发，适合生成流畅自然的摘要
- 在 CNN/DailyMail 数据集上训练，擅长新闻类文本

### T5 (t5-base)
- Text-to-Text Transfer Transformer
- 由 Google 开发，支持多种 NLP 任务
- 统一的文本到文本框架，灵活性高

### RAKE (Rapid Automatic Keyword Extraction)
- 基于词共现统计的快速关键词提取算法
- 无需训练，无需外部语料库
- 适合短语级关键词提取

### TF-IDF (Term Frequency-Inverse Document Frequency)
- 基于词频和逆文档频率的经典算法
- 需要语料库支持（本系统使用句子作为文档）
- 适合单字词关键词提取

## 故障排除

### 后端启动失败
- 确保 Python 版本 >= 3.10
- 检查端口 5000 是否被占用
- 查看控制台错误信息

### 前端启动失败
- 确保 Node.js 版本 >= 18
- 删除 `node_modules` 后重新 `npm install`
- 检查端口 5173 是否被占用

### 模型加载缓慢
- 首次运行需要下载模型（约 1.5GB）
- 确保网络连接正常
- 如果不想使用深度学习模型，系统会自动回退到启发式算法

### PDF 解析失败
- 确保 PDF 不是扫描件（需要可复制的文本）
- 尝试使用其他 PDF 文件测试
- 检查文件大小是否超过 50MB

## 开发说明

- 前端代码位于 `frontend/src/`，使用 TypeScript 编写
- 后端代码位于 `backend/app/`，遵循 Flask 最佳实践
- 所有服务类都采用单例模式，支持延迟初始化
- 模型加载采用懒加载策略，首次调用时才加载

## 许可证

MIT License
