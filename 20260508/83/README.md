# 容器化应用编排监控系统

一个功能完整的容器化应用监控系统，支持 Kubernetes 和 Docker 环境，提供实时监控、健康状态展示、资源统计和扩缩容功能。

## 功能特性

### 🔍 监控功能
- **服务健康状态面板**：红绿黄三色指示服务状态（健康/进行中/降级）
- **Pod/容器状态监控**：实时显示所有运行中的 Pod 和容器状态
- **CPU/内存使用曲线**：实时图表展示资源使用趋势
- **资源使用排行表格**：按 CPU 使用率排序的 Pod 列表

### ⚙️ 操作功能
- **扩缩容操作**：通过界面直接调整 Deployment 副本数
- **事件流展示**：实时展示 Pod 启动、销毁、扩缩容等事件

### 🔌 API 支持
- **Kubernetes API**：自动从 kubeconfig 加载配置，支持认证
- **Docker API**：支持本地 Docker 引擎连接
- **WebSocket 事件流**：实时推送事件到前端

## 技术栈

### 后端
- Node.js + TypeScript
- Express
- @kubernetes/client-node (K8s SDK)
- dockerode (Docker SDK)
- ws (WebSocket)

### 前端
- React 18 + TypeScript
- Vite
- Recharts (图表库)

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 启动服务

**方式一：分别启动（开发模式）**

```bash
# 启动后端（端口 3001）
cd backend
npm run dev

# 启动前端（端口 3000，新开终端）
cd frontend
npm run dev
```

**方式二：使用生产模式**

```bash
# 构建并启动后端
cd backend
npm run build
npm start

# 构建前端
cd frontend
npm run build
```

### 3. 访问系统

打开浏览器访问：http://localhost:3000

## Kubernetes 认证配置

系统自动按以下顺序查找 kubeconfig：

1. `KUBECONFIG` 环境变量指定的路径
2. `~/.kube/config`（默认位置）
3. 集群内 ServiceAccount（如果运行在 K8s 集群中）

## API 接口

### Kubernetes 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/k8s/pods` | 获取 Pod 列表 |
| GET | `/api/k8s/pods/metrics` | 获取 Pod 指标 |
| GET | `/api/k8s/deployments` | 获取 Deployment 列表 |
| POST | `/api/k8s/deployments/scale` | 扩缩容 Deployment |
| GET | `/api/k8s/health` | K8s 连接状态 |

### Docker 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/docker/containers` | 获取容器列表 |
| GET | `/api/docker/containers/stats` | 获取容器统计 |
| GET | `/api/docker/health` | Docker 连接状态 |

### 事件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/events` | 获取历史事件 |
| WS | `/ws/events` | WebSocket 实时事件流 |

## 项目结构

```
.
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── clients/        # API 客户端
│   │   │   ├── kubernetes.ts
│   │   │   └── docker.ts
│   │   ├── routes/         # API 路由
│   │   │   ├── kubernetes.ts
│   │   │   └── docker.ts
│   │   ├── types/          # TypeScript 类型
│   │   └── index.ts        # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── services/       # API 服务
│   │   ├── types/          # TypeScript 类型
│   │   └── App.tsx         # 主组件
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## 注意事项

1. **模拟数据模式**：如果无法连接到真实的 K8s 或 Docker 环境，系统会自动使用模拟数据，方便开发和演示。
2. **扩缩容限制**：界面上限制副本数在 0-10 之间，可以根据需要调整。
3. **WebSocket 重连**：当前版本未实现自动重连，刷新页面即可重新连接。

## License

MIT
