# 在线有限元模拟系统

一个基于 Web 的在线有限元分析（FEA）平台，支持 2D 几何建模、边界条件设置和应力分布可视化。

## 功能特性

- 🎨 **2D 几何建模** - 支持绘制矩形和圆形
- 📐 **边界条件设置** - 固定约束、集中力、压力载荷
- 🧱 **材料属性配置** - 预设材料（钢、铝、铜、塑料、玻璃）+ 自定义
- 🔬 **有限元求解** - 基于弹性力学的应力计算
- 📊 **可视化云图** - Plotly 渲染的应力分布彩色云图
- 🚦 **任务队列** - Celery + Redis 异步任务处理

## 技术栈

### 后端
- **FastAPI** - 高性能 Web API 框架
- **Celery** - 分布式任务队列
- **Redis** - 消息代理和结果存储
- **NumPy/SciPy** - 科学计算库
- **自定义 FEM 求解器** - 纯 Python 实现的平面应力有限元求解

### 前端
- **React 18** - UI 框架
- **Ant Design** - 组件库
- **Plotly.js** - 可视化图表库
- **Axios** - HTTP 客户端

## 项目结构

```
fem-simulation/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI 应用主入口
│   │   ├── models.py        # 数据模型定义
│   │   └── solver.py        # FEM 求解器核心
│   └── requirements.txt     # Python 依赖
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GeometryCanvas.js      # 几何绘图组件
│   │   │   ├── BoundaryConditions.js  # 边界条件设置
│   │   │   ├── MaterialProperties.js  # 材料属性设置
│   │   │   └── ResultVisualization.js # 结果可视化组件
│   │   ├── App.js           # 主应用组件
│   │   ├── api.js           # API 客户端
│   │   └── index.js         # 入口文件
│   └── package.json
└── README.md
```

## 快速开始

### 前置要求

- Python 3.8+
- Node.js 16+
- Redis 6+

### 1. 启动 Redis

Windows 系统可使用 Docker：
```bash
docker run -d -p 6379:6379 redis
```

或从 [Redis 官网](https://redis.io/download) 下载安装。

### 2. 后端设置

```bash
cd backend
pip install -r requirements.txt

# 启动 Celery Worker (在新终端)
celery -A app.main.celery worker --loglevel=info --pool=solo

# 启动 FastAPI 服务 (在新终端)
python -m app.main
```

后端服务将运行在 `http://localhost:8000`

API 文档: `http://localhost:8000/docs`

### 3. 前端设置

```bash
cd frontend
npm install
npm start
```

前端应用将运行在 `http://localhost:3000`

## 使用说明

### 1. 几何建模
- 选择「矩形」或「圆形」工具
- 在画布上拖动绘制形状，或点击「添加预设形状」
- 可调整尺寸参数精确控制

### 2. 边界条件
- 添加固定约束（如左边界固定）
- 添加集中力载荷（如右边界施加拉力）
- 可设置力的大小和方向

### 3. 材料属性
- 选择预设材料或自定义参数
- 调整网格密度（影响计算精度和速度）

### 4. 开始仿真
- 点击「开始仿真」按钮
- 系统将提交任务到后台队列
- 等待计算完成后自动显示应力云图

## FEM 求解器原理

### 核心算法
1. **网格生成** - 将几何形状离散为三角形单元
2. **刚度矩阵组装** - 计算每个单元的刚度矩阵并组装全局矩阵
3. **边界条件施加** - 处理 Dirichlet 和 Neumann 边界条件
4. **线性方程组求解** - 使用稀疏矩阵求解器求解 KU = F
5. **应力计算** - 从位移场计算 Von Mises 等效应力

### 平面应力假设
- 适用于薄板结构
- 厚度方向应力为零
- 使用平面应力本构关系

## API 接口

### POST `/api/simulate`
提交仿真任务

**请求体:**
```json
{
  "shapes": [
    {
      "type": "rectangle",
      "x": 0,
      "y": 0,
      "width": 1,
      "height": 0.5
    }
  ],
  "boundary_conditions": [
    {
      "type": "fixed",
      "location": "left",
      "value": 0.01
    },
    {
      "type": "force",
      "location": "right",
      "value": 10000,
      "direction": "x"
    }
  ],
  "material": {
    "young_modulus": 210000000000,
    "poisson_ratio": 0.3,
    "density": 7850
  },
  "mesh_size": 0.1
}
```

**响应:**
```json
{
  "task_id": "uuid-string",
  "status": "pending"
}
```

### GET `/api/status/{task_id}`
查询任务状态

**响应:**
```json
{
  "task_id": "uuid-string",
  "status": "completed",
  "nodes": [[x1, y1], [x2, y2], ...],
  "elements": [[n1, n2, n3], ...],
  "stress": [s1, s2, ...],
  "displacement": [[dx1, dy1], ...]
}
```

## 注意事项

1. 本系统使用自定义 FEM 求解器，适合教学演示
2. 如需工业级精度，建议集成 FEniCS 或 ANSYS
3. 大型网格计算可能需要较长时间
4. 建议网格尺寸不小于 0.05（平衡精度与速度）

## 许可证

MIT License
