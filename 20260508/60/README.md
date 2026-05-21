# 生物序列比对系统

一个基于 Web 的生物序列比对系统，支持 DNA 和蛋白质序列的双序列比对和多序列比对。

## 功能特性

- **双序列比对**：使用 Smith-Waterman 算法进行局部比对
- **多序列比对**：支持 2-5 条序列的渐进式多序列比对
- **FASTA 格式支持**：接受标准 FASTA 格式或纯序列输入
- **可视化展示**：
  - 比对视图：匹配（绿色）、错配（红色）、Gap（灰色）颜色高亮
  - 相似度矩阵热力图：直观展示序列间的相似性
  - 一致性序列显示
- **可配置参数**：匹配得分、错配得分、Gap 罚分可自定义
- **自动序列类型检测**：自动识别 DNA 或蛋白质序列

## 技术栈

### 后端
- Python 3.8+
- Flask (Web 框架)
- NumPy (数值计算)
- Flask-CORS (跨域支持)

### 前端
- React 18 (CDN 版本)
- Babel Standalone (浏览器端 JSX 编译)
- Axios (HTTP 客户端)
- 纯 HTML/CSS/JS，无需构建

## 快速开始

### 方式一：使用启动脚本（推荐）

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

#### 1. 安装后端依赖
```bash
cd backend
pip install -r requirements.txt
```

#### 2. 启动后端服务
```bash
cd backend
python app.py
```
后端服务将在 http://localhost:5000 启动

#### 3. 启动前端服务
```bash
cd frontend
python -m http.server 3000
```
前端服务将在 http://localhost:3000 启动

### 使用系统

打开浏览器访问 http://localhost:3000

#### 双序列比对
1. 点击"双序列比对"标签
2. 在两个文本框中输入 DNA 或蛋白质序列（支持 FASTA 格式）
3. 调整比对参数（可选）
4. 点击"开始比对"

#### 多序列比对
1. 点击"多序列比对"标签
2. 输入 2-5 条序列（点击"+ 添加序列"增加输入框）
3. 调整比对参数（可选）
4. 点击"开始多序列比对"

## API 接口

### POST /api/pairwise-align
双序列比对

**请求体：**
```json
{
  "sequence1": ">seq1\nATCGATCG",
  "sequence2": ">seq2\nATCGAGCT",
  "type": "auto",
  "match_score": 2,
  "mismatch_score": -1,
  "gap_penalty": -2
}
```

**响应：**
- `alignment1`, `alignment2`: 比对后的两条序列
- `matches`: 匹配标记线（'|'表示匹配，空格表示不匹配）
- `score`: 比对得分
- `identity`: 相似度百分比
- `gap_count1`, `gap_count2`: 两条序列的Gap数量

### POST /api/multiple-align
多序列比对

**请求体：**
```json
{
  "sequences": [">seq1\nATCGATCG", ">seq2\nATCGAGCT", ">seq3\nATCGATCG"],
  "type": "auto",
  "match_score": 2,
  "mismatch_score": -1,
  "gap_penalty": -2
}
```

**响应：**
- `alignments`: 比对后的所有序列数组
- `consensus`: 一致性序列
- `similarity_matrix`: 相似度矩阵（百分比）
- `distance_matrix`: 距离矩阵
- `alignment_length`: 比对总长度

### POST /api/validate-sequence
验证序列有效性

### GET /api/health
健康检查

## 项目结构

```
.
├── start.bat                 # Windows 启动脚本
├── start.sh                  # Linux/Mac 启动脚本
├── backend/
│   ├── app.py                # Flask 应用主入口
│   ├── requirements.txt      # Python 依赖
│   ├── test_algorithms.py    # 算法测试脚本
│   ├── test_api.py           # API 测试脚本
│   ├── algorithms/
│   │   ├── smith_waterman.py # Smith-Waterman 算法
│   │   └── msa.py            # 多序列比对算法
│   └── utils/
│       └── fasta_parser.py   # FASTA 格式解析
└── frontend/
    ├── index.html            # 入口 HTML
    ├── styles.css            # 样式文件
    └── app.jsx               # React 应用（CDN版本）
```

## 算法说明

### Smith-Waterman 算法
- 局部序列比对算法
- 时间复杂度：O(n*m)，其中 n 和 m 是两条序列的长度
- 使用动态规划构建得分矩阵，然后回溯找到最优局部比对
- 支持自定义匹配得分、错配得分和Gap罚分

### 渐进式多序列比对
1. 计算所有序列对之间的距离矩阵（基于Smith-Waterman比对结果）
2. 构建向导树（guide tree）确定比对顺序
3. 按照向导树的顺序逐步合并序列比对
4. 生成一致性序列和相似度矩阵

## 支持的序列类型

### DNA 序列
- 有效字符：A, T, C, G, N (N表示任意碱基)

### 蛋白质序列
- 有效字符：A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y, * (终止密码子)

## 输入格式示例

### FASTA 格式
```
>seq1_description
ATCGATCGATCGATCG
>seq2_description
ATCGATCGAGCTAGCT
```

### 纯序列格式
```
ATCGATCGATCGATCG
```

## 许可证

MIT License
