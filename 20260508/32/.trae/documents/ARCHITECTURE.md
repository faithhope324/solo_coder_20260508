# 3D 水面波纹模拟 - 技术架构文档

## 1. 项目结构

```
src/
├── main.js                 # 入口文件
├── core/
│   ├── WaterGeometry.js    # 水面几何模块
│   ├── WaterMaterial.js    # 着色器材质模块
│   ├── RippleSystem.js     # 波纹扰动系统
│   └── WaterRenderer.js    # 渲染器封装
├── shaders/
│   ├── water.vert.glsl     # 顶点着色器
│   └── water.frag.glsl     # 片元着色器
└── utils/
    └── MousePicker.js      # 鼠标拾取工具
```

## 2. 模块设计

### 2.1 水面几何模块 (WaterGeometry.js)

**职责**: 创建和管理水面的平面网格几何

**核心功能**:
- 创建细分平面几何体 (PlaneGeometry)
- 支持动态更新顶点位置
- 存储原始顶点位置用于波纹计算

**关键参数**:
- `width`: 水面宽度
- `height`: 水面高度
- `segments`: 细分数 (默认 128x128)

### 2.2 着色器材质模块 (WaterMaterial.js)

**职责**: 管理水面的着色器材质和uniform变量

**核心功能**:
- 加载并编译GLSL着色器
- 管理uniform变量（时间、波纹数据、光照参数）
- 实现Gerstner波算法的顶点位移

**Uniform变量**:
```glsl
uniform float uTime;              // 时间
uniform vec3 uColor;              // 水色
uniform vec3 uSkyColor;           // 天空色
uniform float uWaveAmplitude;     // 波浪振幅
uniform float uWaveFrequency;     // 波浪频率
uniform float uWaveSpeed;         // 波浪速度
uniform vec2 uRipplePositions[8]; // 波纹位置
uniform float uRippleTimes[8];    // 波纹时间
uniform int uRippleCount;         // 活跃波纹数
```

### 2.3 波纹系统模块 (RippleSystem.js)

**职责**: 管理鼠标点击产生的波纹效果

**核心功能**:
- 维护波纹池（最多8个活跃波纹）
- 接收点击位置并创建新波纹
- 更新波纹生命周期（衰减、扩散）
- 向着色器传递波纹数据

**波纹生命周期**:
1. 点击触发 → 波纹创建
2. 波纹扩散（半径随时间增大）
3. 振幅衰减（指数衰减）
4. 波纹消失（从池中移除）

### 2.4 鼠标拾取模块 (MousePicker.js)

**职责**: 将鼠标屏幕坐标转换为水面3D坐标

**核心功能**:
- 使用Raycaster进行射线检测
- 计算鼠标与水面平面的交点
- 返回3D世界坐标用于波纹生成

### 2.5 渲染器模块 (WaterRenderer.js)

**职责**: 封装Three.js渲染流程

**核心功能**:
- 初始化Scene、Camera、Renderer
- 设置相机和光照
- 管理动画循环
- 处理窗口大小变化

## 3. 着色器设计

### 3.1 顶点着色器 (water.vert.glsl)

**主要计算**:
1. Gerstner波位移计算（简化版）
2. 波纹高度叠加
3. 法向量计算用于光照

**Gerstner波简化公式**:
```glsl
float wave = sin(position.x * uWaveFrequency + uTime * uWaveSpeed) 
           * cos(position.z * uWaveFrequency * 0.7 + uTime * uWaveSpeed * 0.8)
           * uWaveAmplitude;
```

**波纹叠加**:
```glsl
for (int i = 0; i < 8; i++) {
    if (i >= uRippleCount) break;
    float dist = distance(position.xz, uRipplePositions[i]);
    float ripple = sin(dist * 10.0 - uRippleTimes[i] * 5.0) 
                 * exp(-dist * 0.5) 
                 * exp(-uRippleTimes[i] * 0.5);
    wave += ripple * 0.3;
}
```

### 3.2 片元着色器 (water.frag.glsl)

**主要效果**:
1. 菲涅尔反射计算
2. 镜面高光
3. 环境反射模拟
4. 法线扰动

**菲涅尔公式**:
```glsl
float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
vec3 finalColor = mix(waterColor, skyColor, fresnel * 0.6);
```

## 4. 数据流

```
鼠标点击 → MousePicker → 3D坐标 → RippleSystem → 波纹数据
                                                      ↓
动画循环 → 更新uTime → WaterMaterial → 着色器 → 渲染结果
                  ↑
            RippleSystem更新波纹状态
```

## 5. 性能优化策略

1. **几何体优化**: 使用合理的细分数，避免过度细分
2. **波纹池限制**: 最多同时8个波纹，自动回收过期波纹
3. **着色器优化**: 在GPU中并行计算波纹
4. **Uniform更新**: 每帧只更新必要的uniform变量
