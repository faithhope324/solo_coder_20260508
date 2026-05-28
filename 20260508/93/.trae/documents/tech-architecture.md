## 1. 架构设计

```mermaid
graph TB
    "Frontend[前端 React]" --> "API[Express API]"
    "API" --> "Model[数值预报模型]"
    "Model" --> "DataStore[网格数据存储]"
    "DataStore" --> "API"
    "API" --> "Frontend"
    "Frontend" --> "Leaflet[Leaflet 地图]"
    "Frontend" --> "Canvas[Canvas 叠加层]"
```

## 2. 技术说明

- 前端：React@18 + tailwindcss@3 + vite + TypeScript
- 初始化工具：vite-init
- 后端：Express@4 + TypeScript (ESM)
- 数据库：无，使用内存中的网格数据

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含地图可视化和所有控制面板 |

## 4. API 定义

### 4.1 获取网格气象数据

```
GET /api/weather/grid
Query: variable=temperature|humidity|wind_speed
       level=1000|850|500|250
       step=0..72 (小时)
Response: {
  latMin: number, latMax: number, latStep: number,
  lonMin: number, lonMax: number, lonStep: number,
  values: number[][] // 二维网格值
}
```

### 4.2 获取风场数据（U/V 分量）

```
GET /api/weather/wind
Query: level=1000|850|500|250
       step=0..72
Response: {
  latMin, latMax, latStep, lonMin, lonMax, lonStep,
  u: number[][],  // 东西向风速
  v: number[][]   // 南北向风速
}
```

### 4.3 查询单点数据

```
GET /api/weather/point
Query: lat=number, lon=number, level=1000|850|500|250, step=0..72
Response: {
  temperature: number,
  humidity: number,
  windSpeed: number,
  windDirection: number,
  u: number,
  v: number
}
```

### 4.4 获取可用时间步信息

```
GET /api/weather/timesteps
Response: {
  steps: number[],      // [0, 1, 2, ..., 72]
  startTime: string,    // ISO 时间
  stepHours: number     // 每步小时数
}
```

## 5. 服务器架构图

```mermaid
graph LR
    "Controller[路由控制器]" --> "Service[气象服务]"
    "Service" --> "Model[数值预报模型]"
    "Model" --> "GridData[网格数据生成器]"
```

## 6. 数据模型

### 6.1 数值预报模型说明

后端实现简化版数值天气预报模型，包含以下物理推理过程：

1. **初始场生成**：基于纬度-经度网格生成初始温度场，考虑纬度递减率（极地冷、赤道暖）
2. **湿度场计算**：基于 Clausius-Clapeyron 方程，根据温度计算饱和水汽压，再乘以相对湿度系数
3. **地转风计算**：基于气压梯度力与科氏力平衡（地转风关系），计算 U/V 风速分量
4. **时间积分**：采用欧拉前差格式，根据运动方程对温度场进行时间步进，模拟气团平流
5. **高度层调整**：不同等压面层有不同的基准温度递减率（标准大气递减率约 6.5°C/km）

### 6.2 网格数据结构

```typescript
interface GridData {
  latMin: number   // 15
  latMax: number   // 55
  latStep: number  // 0.5
  lonMin: number   // 70
  lonMax: number   // 140
  lonStep: number  // 0.5
  values: number[][]  // [lat][lon]
}
```

网格分辨率：0.5° × 0.5°，覆盖 15°N-55°N, 70°E-140°E（中国及周边区域）
纬向 81 点 × 经向 141 点
