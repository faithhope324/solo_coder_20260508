# 图文检索系统

基于 CLIP 模型的图文检索系统，支持文本搜图和以图搜图。

## 功能特性

- **文本搜图**：输入文字描述，检索最匹配的图片
- **以图搜图**：上传图片，检索相似图片
- **相似度分数**：返回 Top10 匹配结果及相似度分数
- **增量索引**：支持新增图片自动索引
- **一键重建**：前端可一键重建索引

## 技术栈

- **后端**：FastAPI
- **模型**：OpenCLIP (ViT-B-32, LAION-2B 预训练)
- **向量数据库**：FAISS (内积相似度)
- **前端**：HTML + JavaScript (原生实现)

## 项目结构

```
.
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI 主程序，提供 API 接口
│   ├── feature_extractor.py   # CLIP 特征提取模块
│   ├── vector_db.py        # FAISS 向量数据库封装
│   └── index_images.py     # 图片索引构建脚本
├── frontend/
│   └── index.html          # 前端搜索界面
├── images/                 # 图片库目录（放入待检索的图片）
├── index/                  # 向量索引存储目录
├── start.bat              # Windows 一键启动脚本
├── build_index.bat        # Windows 构建索引脚本
└── requirements.txt       # Python 依赖配置
```

## 快速开始

### Windows 用户（推荐）

1. 双击 `build_index.bat` 构建图片索引
2. 双击 `start.bat` 启动服务
3. 浏览器自动打开 `http://localhost:8000`

### 命令行方式

#### 1. 安装依赖

```bash
pip install -r requirements.txt
```

#### 2. 准备图片库

将待检索的图片放入 `images/` 目录，支持格式：JPG、PNG、GIF、BMP、WebP

#### 3. 构建向量索引

```bash
python backend/index_images.py
```

可选参数：
- `--images-dir`：指定图片目录（默认：images）
- `--index-dir`：指定索引存储目录（默认：index）
- `--reset`：重置现有索引重新构建

#### 4. 启动服务

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

#### 5. 访问前端

打开浏览器访问 `http://localhost:8000`

## API 接口文档

启动服务后访问 `http://localhost:8000/docs` 查看完整的 Swagger 文档。

### 主要接口

#### 文本搜图
```
POST /api/search/text
Content-Type: application/json

{
    "text": "一只棕色狗在草地奔跑",
    "top_k": 10
}
```

#### 以图搜图
```
POST /api/search/image
Content-Type: multipart/form-data

file: 图片文件
top_k: 10
```

#### 获取统计信息
```
GET /api/stats
```

#### 重建索引
```
POST /api/index/rebuild
```

## 核心模块说明

### feature_extractor.py
- `FeatureExtractor` 类：单例模式封装 CLIP 模型
- 支持图片特征提取和文本特征提取
- 特征向量自动归一化，便于相似度计算

### vector_db.py
- `VectorDatabase` 类：FAISS 向量数据库封装
- 使用内积（Inner Product）计算相似度
- 支持向量的增删查和持久化存储

### index_images.py
- 批量处理图片目录，提取特征并构建索引
- 支持增量索引（自动跳过已索引图片）
- 错误处理：跳过无法处理的图片

## 相似度说明

系统返回的相似度分数范围为 `[0, 1]`：
- `> 0.8`：高度相关
- `0.6 - 0.8`：中度相关
- `0.4 - 0.6`：弱相关
- `< 0.4`：可能不相关

## 性能优化建议

1. **GPU 加速**：安装 CUDA 版本的 PyTorch 可大幅提升特征提取速度
2. **批量索引**：首次构建索引时建议批量处理
3. **增量更新**：新增图片后只需运行索引脚本，无需重建
4. **图片尺寸**：建议图片最长边不超过 1024px，过大的图片会影响处理速度

## 常见问题

**Q: 首次运行为什么很慢？**
A: 首次运行需要下载 CLIP 模型预训练权重（约 600MB），请耐心等待。

**Q: 如何添加新图片到检索库？**
A: 将新图片放入 `images/` 目录，重新运行 `python backend/index_images.py` 即可，系统会自动索引新图片。

**Q: 支持多少张图片？**
A: FAISS 可支持百万级图片，具体取决于内存大小。

**Q: 可以更换更大的模型吗？**
A: 可以修改 `feature_extractor.py` 中的模型名称，如 `ViT-L-14` 可获得更高精度但速度更慢。
