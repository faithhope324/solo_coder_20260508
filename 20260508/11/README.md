# Logistic 映射混沌分析器

一个用于分析混沌系统 Lyapunov 指数的 Web 应用，以 Logistic 映射为例。

## 功能特性

- **时间序列图**: 显示 Logistic 映射迭代过程中的 xₙ 变化
- **Lyapunov 指数**: 计算并显示 Lyapunov 指数值，判断系统是否处于混沌状态
- **分岔图**: 通过参数扫描 r ∈ [0, 4] 展示分岔现象
- **Lyapunov 指数曲线**: 显示 λ 随参数 r 变化的曲线
- **实时计算**: 调整参数 r 和初始值 x₀ 后点击"重新计算"按钮实时更新结果

## 技术栈

- **后端**: Python + Flask + NumPy
- **前端**: HTML + Plotly.js
- **混沌模型**: Logistic 映射 xₙ₊₁ = r × xₙ × (1 - xₙ)

## 项目结构

```
.
├── app.py              # Flask 后端应用
├── chaos.py            # 混沌计算模块
├── run.py              # 启动脚本
├── requirements.txt    # Python 依赖
└── templates/
    └── index.html      # 前端页面
```

## 安装和运行

### 方法 1: 使用 Python 直接运行

1. 安装依赖:
```bash
pip install flask numpy
```

2. 启动应用:
```bash
python run.py
```

3. 在浏览器中打开: http://localhost:5000

### 方法 2: 使用虚拟环境 (推荐)

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

## 使用说明

1. **参数设置**:
   - **生长参数 r**: 0-4 之间的数值（例如 3.8 会产生混沌）
   - **初始值 x₀**: 0-1 之间的数值
   - **迭代次数**: 计算时间序列的迭代次数

2. **Lyapunov 指数解读**:
   - **λ > 0**: 正的 Lyapunov 指数表示系统处于混沌状态
   - **λ ≤ 0**: 非正的 Lyapunov 指数表示系统处于稳定状态

3. **分岔图**:
   - 横轴为参数 r (0-4)
   - 纵轴为系统收敛到的稳定值（或周期轨道、混沌吸引子）

## 核心算法

### Logistic 映射
xₙ₊₁ = r × xₙ × (1 - xₙ)

### Lyapunov 指数计算
λ = (1/n) × Σ ln|f'(xᵢ)|，其中 f'(x) = r × (1 - 2x)
