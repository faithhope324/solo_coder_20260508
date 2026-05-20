# 粒子对撞模拟系统

一个基于Web的粒子对撞模拟可视化系统，使用简化的相空间模型生成末态粒子，并用Three.js进行3D可视化。

## 功能特点

- 支持两种对撞模式：电子-正电子 (e⁺e⁻) 和质子-质子 (pp)
- 可调对撞能量：e⁺e⁻ 10-1000 GeV，pp 10-14000 GeV
- 多种物理过程：通用过程、Higgs玻色子产生、Z玻色子产生
- 3D可视化粒子径迹（螺旋线/直线），考虑磁场效应
- 显示每个粒子的能量、动量、横动量、赝快度等物理量
- 支持按粒子类型筛选（电子、μ子、光子、强子、玻色子等）
- 展示衰变链，可视化Higgs→bb̄、Higgs→WW*、Z→μ⁺μ⁻等衰变过程

## 项目结构

```
52/
├── backend/                    # 后端代码
│   ├── __init__.py
│   ├── app.py                 # Flask API服务器
│   ├── particle_data.py       # 粒子数据库和衰变表
│   └── phase_space.py         # 相空间生成和衰变模拟
├── frontend/                   # 前端代码
│   ├── index.html             # 主页面
│   └── static/
│       ├── css/
│       │   └── style.css      # 样式文件
│       └── js/
│           └── main.js        # Three.js渲染和交互逻辑
├── requirements.txt           # Python依赖
├── start_backend.bat          # Windows后端启动脚本
└── start_frontend.bat         # Windows前端启动脚本
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动后端服务器

在Windows上双击 `start_backend.bat`，或手动运行：

```bash
cd backend
python app.py
```

后端服务器将在 `http://localhost:5000` 启动。

### 3. 启动前端服务器

在Windows上双击 `start_frontend.bat`，或手动运行：

```bash
cd frontend
python -m http.server 8000
```

前端页面将在 `http://localhost:8000` 可用。

### 4. 访问应用

在浏览器中打开 `http://localhost:8000`

## 使用说明

### 对撞参数设置

1. **粒子类型**：选择 e⁺e⁻ 或 pp 对撞
2. **物理过程**：
   - 通用过程：生成随机末态粒子
   - Higgs 玻色子产生：模拟 Higgs 产生和衰变
   - Z 玻色子产生：模拟 Z 玻色子共振产生
3. **对撞能量**：调节质心系能量（√s）
4. **径迹长度**：控制粒子径迹的显示长度
5. **磁场强度**：调节磁场，观察带电粒子的螺旋径迹弯曲

### 粒子筛选

可以通过复选框筛选显示的粒子类型：
- 带电粒子 / 中性粒子
- 电子/正电子
- μ子
- 光子
- 强子（π介子、K介子、质子等）
- Higgs/Z/W 玻色子

### 查看粒子信息

点击左侧粒子列表中的任意粒子，可以：
- 在3D视图中高亮显示该粒子的径迹
- 查看粒子的详细物理信息
- 在衰变链面板中查看该粒子的衰变过程

## 物理模型说明

本系统使用简化的相空间模型（类似PYTHIA的部分功能）：

1. **相空间生成**：使用RAMBO算法生成N体末态相空间
2. **粒子衰变**：基于分支比随机选择衰变模式，递归衰变直到稳定粒子
3. **强子化**：夸克和胶子被组合为强子（简化模型）
4. **径迹模拟**：带电粒子在磁场中以螺旋线运动，中性粒子沿直线运动

注意：这是一个**简化的教育演示模型**，不是精确的蒙特卡洛发生器。对于精确的物理研究，请使用PYTHIA、Herwig等专业发生器。

## API接口

### POST /api/simulate

模拟一次对撞事件。

请求体：
```json
{
    "collision_type": "e+e-",
    "sqrt_s": 91,
    "process": "higgs"
}
```

响应：
```json
{
    "event": {
        "collision_type": "e+e-",
        "sqrt_s": 91,
        "process": "higgs",
        "n_all": 10,
        "n_stable": 8
    },
    "all_particles": [...],
    "stable_particles": [...]
}
```

### GET /api/particle-types

获取可用的对撞类型。

### GET /api/processes

获取可用的物理过程。

### GET /api/energy-ranges

获取各对撞类型的能量范围。

## 技术栈

- **后端**：Python 3.8+, Flask, NumPy, SciPy
- **前端**：HTML5, CSS3, JavaScript, Three.js
- **可视化**：Three.js r128 + OrbitControls

## 常见问题

**Q: 为什么有些粒子看不到径迹？**
A: 可能是因为：
- 粒子是中微子，不与探测器相互作用
- 粒子被筛选条件过滤了
- 粒子的横动量太小，径迹太短

**Q: 如何看到Higgs衰变？**
A: 选择 "Higgs 玻色子产生" 过程，并将对撞能量设置为 250 GeV 以上（e⁺e⁻）或 13000 GeV（pp）。

**Q: 可以导出事件数据吗？**
A: 当前版本暂不支持导出功能。可以通过浏览器开发者工具查看网络请求的响应数据。

## 许可证

本项目仅用于教育目的。
