# 天体力学 N 体模拟系统

一个交互式的天体力学 N 体模拟平台，支持自定义行星参数、高精度数值积分、实时 3D 可视化和数据分析。

## 功能特性

- 🪐 **自定义行星配置**：设置行星质量、初始位置和速度，支持多行星系统
- 🧮 **高精度积分器**：实现 Runge-Kutta 4 (RK4) 和 Hermite 两种积分算法
- 🚀 **并行计算加速**：使用 Worker Threads 进行多线程力计算
- 🌌 **3D 实时渲染**：基于 Three.js 的沉浸式宇宙场景，支持轨道线、质心标记
- ⏯️ **播放控制**：开始/暂停、加速/减速、单步执行、重置
- 📊 **数据监控**：实时能量变化曲线、质心位置、行星状态信息
- 🎯 **预设场景**：内置太阳系、双星系统、三体问题等经典案例

## 技术栈

### 前端
- React 18 + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- Zustand 状态管理
- Chart.js 数据可视化
- Tailwind CSS 样式
- Socket.io Client 实时通信

### 后端
- Express 4 + TypeScript
- Socket.io WebSocket 服务
- Worker Threads 并行计算
- 自定义 RK4 / Hermite 积分算法

## 项目结构

```
├── api/                      # 后端代码
│   ├── data/                 # 数据配置
│   │   └── presets.ts        # 预设场景数据
│   ├── integrators/          # 积分算法
│   │   ├── rk4.ts            # Runge-Kutta 4 积分器
│   │   └── hermite.ts        # Hermite 积分器
│   ├── physics/              # 物理计算
│   │   ├── forceCalculator.ts    # 引力计算
│   │   └── energyCalculator.ts   # 能量计算
│   ├── services/             # 服务层
│   │   └── SimulationService.ts  # 模拟服务
│   ├── workers/              # 工作线程
│   │   └── forceWorker.ts    # 力计算工作线程
│   └── index.ts              # 服务器入口
├── shared/                   # 共享类型定义
│   └── types.ts
├── src/                      # 前端代码
│   ├── components/
│   │   ├── three/            # Three.js 组件
│   │   │   ├── SimulationScene.tsx
│   │   │   ├── Planet.tsx
│   │   │   ├── OrbitTrail.tsx
│   │   │   ├── CenterOfMass.tsx
│   │   │   └── StarField.tsx
│   │   └── ui/               # UI 组件
│   │       ├── ControlPanel.tsx
│   │       ├── PlaybackControls.tsx
│   │       └── DataPanel.tsx
│   ├── services/
│   │   └── socket.ts         # WebSocket 客户端
│   ├── store/
│   │   └── useSimulationStore.ts  # Zustand 状态管理
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .trae/documents/          # 项目文档
│   ├── PRD.md                # 产品需求文档
│   └── TECHNICAL_ARCHITECTURE.md  # 技术架构文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 安装和运行

### 前置要求
- Node.js >= 18.0.0
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

同时启动前端开发服务器和后端 API 服务器：

```bash
npm run dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001

### 生产构建

```bash
npm run build
npm start
```

## 使用说明

### 1. 配置行星系统

- 在左侧面板的「行星列表」中添加或编辑行星
- 设置每个行星的质量、半径、颜色、初始位置和速度
- 在「积分设置」中选择积分算法和时间步长

### 2. 加载预设场景

- 点击「预设」标签页
- 选择内置的经典场景（太阳系、双星系统、三体问题等）

### 3. 运行模拟

- 点击底部播放栏的播放按钮开始模拟
- 使用速度按钮调节模拟速度（0.25x - 8x）
- 点击暂停按钮暂停模拟
- 使用单步按钮逐帧查看

### 4. 查看数据

- 右侧面板显示实时能量数据和质心位置
- 能量变化曲线展示总能量、动能和势能的变化趋势
- 点击 3D 场景中的行星查看详细状态信息

### 5. 场景交互

- 鼠标左键拖动：旋转视角
- 鼠标滚轮：缩放
- 鼠标右键拖动：平移

## 核心算法

### RK4 积分器

四阶龙格-库塔方法，通过四个中间步骤提高数值积分精度：

```
k1 = f(t, y)
k2 = f(t + dt/2, y + dt*k1/2)
k3 = f(t + dt/2, y + dt*k2/2)
k4 = f(t + dt, y + dt*k3)
y(t+dt) = y(t) + (dt/6)(k1 + 2k2 + 2k3 + k4)
```

### Hermite 积分器

基于泰勒展开的高阶积分方法，同时利用位置、速度、加速度和加加速度（jerk）信息，适用于需要高精度的天体力学计算。

### 引力软化

为避免数值奇点，在引力计算中引入软化参数 ε：

```
F = G * m1 * m2 * r / (|r|² + ε²)^(3/2)
```

## API 接口

### WebSocket 事件

**客户端 → 服务器**
- `start` `{ config: SimulationConfig }` 开始模拟
- `pause` 暂停模拟
- `resume` 恢复模拟
- `reset` 重置模拟
- `stepOnce` 单步执行
- `setSpeed` `{ speed: number }` 设置速度

**服务器 → 客户端**
- `step` `TimeStepData` 每步数据
- `error` `{ message: string }` 错误信息

### HTTP 接口

- `GET /api/presets` 获取预设场景列表
- `POST /api/simulate` 提交批量模拟任务

## 性能优化

- **并行计算**：力的计算分摊到多个 Worker 线程
- **数据结构**：使用 TypedArray 减少内存开销
- **渲染优化**：InstancedMesh 渲染多个行星，BufferGeometry 绘制轨道线
- **历史数据**：限制轨迹历史长度，避免内存泄漏

## 许可证

MIT License
