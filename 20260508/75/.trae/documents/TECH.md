## 1. 架构设计

```mermaid
graph TD
    subgraph Frontend["前端 (React + Vite)"]
        A[文本输入组件]
        B[PDF上传组件]
        C[模型选择器组件]
        D[多标签摘要展示组件]
        E[关键词云组件]
        F[原文高亮展示组件]
        G[API服务层]
    end
    
    subgraph Backend["后端 (Flask)"]
        H[API路由层]
        I[PDF解析服务]
        J[摘要生成服务]
        K[关键词提取服务]
    end
    
    subgraph Models["NLP模型层"]
        L[BART模型]
        M[T5模型]
        N[RAKE算法]
        O[TF-IDF算法]
    end
    
    A --> G
    B --> G
    C --> G
    G --> H
    H --> I
    H --> J
    H --> K
    J --> L
    J --> M
    K --> N
    K --> O
    H --> G
    G --> D
    G --> E
    G --> F
```

## 2. 技术描述

- **前端**：React 18 + TypeScript + Vite + TailwindCSS 3
- **UI组件**：自定义组件 + Phosphor Icons
- **后端**：Flask 3.x + Python 3.10+
- **PDF解析**：PyPDF2 + pdfplumber
- **NLP模型**：HuggingFace Transformers (BART、T5)
- **关键词提取**：RAKE + scikit-learn (TF-IDF)
- **关键词云**：react-d3-cloud
- **HTTP通信**：Axios

## 3. 目录结构

```
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TextInput.tsx
│   │   │   ├── PDFUpload.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── SummaryTabs.tsx
│   │   │   ├── KeywordCloud.tsx
│   │   │   └── HighlightedText.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── services/
│   │   │   ├── pdf_parser.py
│   │   │   ├── summarizer.py
│   │   │   └── keyword_extractor.py
│   │   └── utils/
│   │       └── text_processor.py
│   ├── requirements.txt
│   └── run.py
└── README.md
```

## 4. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 主应用页面 |
| /api/upload | PDF上传与解析 |
| /api/summarize | 文本摘要生成 |
| /api/keywords | 关键词提取 |
| /api/analyze | 完整分析（摘要+关键词） |

## 5. API 定义

```typescript
// 请求类型
interface AnalyzeRequest {
  text?: string;
  file?: File;
  summaryModels: ('bart' | 't5')[];
  keywordAlgorithm: 'rake' | 'tfidf';
  summaryLength?: 'short' | 'medium' | 'long';
  maxKeywords?: number;
}

// 响应类型
interface AnalyzeResponse {
  success: boolean;
  originalText: string;
  summaries: {
    model: string;
    summary: string;
    processingTime: number;
  }[];
  keywords: {
    word: string;
    weight: number;
    positions: { start: number; end: number }[];
  }[];
  algorithm: string;
  totalProcessingTime: number;
}

interface PDFParseResponse {
  success: boolean;
  text: string;
  pageCount: number;
  fileName: string;
}
```

## 6. 后端服务架构

```mermaid
graph LR
    A[API Routes] --> B[Request Validator]
    B --> C{请求类型}
    C -->|PDF上传| D[PDF Parser Service]
    C -->|摘要请求| E[Summarizer Service]
    C -->|关键词请求| F[Keyword Extractor Service]
    C -->|完整分析| G[Pipeline Service]
    
    D --> H[PyPDF2/pdfplumber]
    E --> I[Model Factory]
    I --> J[BART Model]
    I --> K[T5 Model]
    F --> L[Algorithm Factory]
    L --> M[RAKE]
    L --> N[TF-IDF]
    
    G --> D
    G --> E
    G --> F
```

## 7. 数据模型

### 7.1 关键词数据结构

```mermaid
erDiagram
    KEYWORD {
        string word
        float weight
        array positions
    }
    
    SUMMARY_RESULT {
        string model_name
        string summary_text
        float processing_time
    }
    
    ANALYSIS_RESULT {
        string id
        string original_text
        array summaries
        array keywords
        string keyword_algorithm
        float total_time
        timestamp created_at
    }
    
    ANALYSIS_RESULT ||--o{ SUMMARY_RESULT : contains
    ANALYSIS_RESULT ||--o{ KEYWORD : contains
```

## 8. 核心算法说明

### 8.1 摘要生成
- **BART**：facebook/bart-large-cnn，适合新闻类文本摘要
- **T5**：t5-small/t5-base，支持"summarize: "前缀提示
- 支持自定义摘要长度（短/中/长）

### 8.2 关键词提取
- **RAKE**：基于词共现的快速关键词提取，无需训练
- **TF-IDF**：基于词频-逆文档频率，适合有语料库的场景
- 返回关键词在原文中的位置索引，用于前端高亮

### 8.3 PDF解析
- 使用 pdfplumber 处理扫描质量高的PDF
- 备用 PyPDF2 处理兼容性问题
- 自动去除页眉页脚和多余空白
