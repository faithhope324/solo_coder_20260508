# 分布式追踪与告警系统

一个完整的分布式追踪与告警系统，支持接收 OpenTelemetry 格式的 Span 数据，展示服务拓扑图，查看服务详情，并配置告警规则。

## 功能特性

### 后端
- ✅ 接收 OpenTelemetry 格式的 Span 数据
- ✅ 内存存储（可扩展为 Jaeger/Elasticsearch）
- ✅ 服务拓扑图数据聚合
- ✅ 服务指标计算（错误率、延迟分位数 P50/P90/P95/P99）
- ✅ 错误追踪查询
- ✅ 告警规则引擎
- ✅ Webhook 通知支持

### 前端
- ✅ 交互式服务拓扑图（力导向布局）
- ✅ 节点颜色表示错误率状态
- ✅ 点击节点查看服务详情
- ✅ 延迟分位数图表
- ✅ 最近 10 条错误追踪展示
- ✅ 告警规则配置页面
- ✅ 告警记录查看

## 项目结构

```
.
├── backend/                 # 后端服务
│   ├── package.json
│   └── src/
│       ├── index.js         # Express 服务器入口
│       ├── storage.js       # 数据存储与聚合
│       ├── alertEngine.js   # 告警引擎
│       └── seed.js          # 模拟数据生成器
└── frontend/                # 前端应用
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css
        ├── components/
        │   ├── ServiceTopology.jsx  # 拓扑图组件
        │   └── ServicePanel.jsx     # 服务详情面板
        └── pages/
            ├── TopologyPage.jsx     # 拓扑图页面
            ├── AlertsPage.jsx       # 告警记录页面
            └── RulesPage.jsx        # 告警规则页面
```

## 快速开始

### 1. 启动后端服务

```bash
cd backend
npm install
npm start
```

后端服务将在 `http://localhost:3001` 启动。

### 2. 启动前端应用

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 `http://localhost:3000` 启动。

### 3. 生成模拟数据（可选）

打开一个新的终端，运行数据生成器：

```bash
cd backend
npm run seed
```

这将持续生成模拟的 Span 数据，用于演示。

## API 接口

### 追踪数据
- `POST /api/v1/traces` - 接收 Span 数据（OpenTelemetry 格式）
- `GET /api/v1/topology` - 获取服务拓扑图数据
- `GET /api/v1/services/:serviceName` - 获取服务详情
- `GET /api/v1/services/:serviceName/error-traces` - 获取服务的错误追踪

### 告警相关
- `GET /api/v1/alerts` - 获取告警记录
- `GET /api/v1/alerts/rules` - 获取告警规则
- `POST /api/v1/alerts/rules` - 创建告警规则
- `PUT /api/v1/alerts/rules/:id` - 更新告警规则
- `DELETE /api/v1/alerts/rules/:id` - 删除告警规则

### Span 数据格式（OpenTelemetry）

```json
{
  "traceId": "string",
  "spanId": "string",
  "name": "操作名称",
  "serviceName": "服务名称",
  "parentServiceName": "父服务名称（可选）",
  "startTime": 1234567890000000000,
  "endTime": 1234567890001000000,
  "duration": 1000000,
  "status": "OK" | "ERROR",
  "statusMessage": "错误信息（可选）",
  "tags": {
    "error": true | false,
    "errorMessage": "错误详情",
    "httpMethod": "GET",
    "httpStatus": 200
  },
  "attributes": {
    "http.method": "GET",
    "http.status_code": 200
  }
}
```

## 告警规则配置

### 支持的条件类型
- `error_rate_gt` - 错误率大于（%）
- `error_rate_lt` - 错误率小于（%）
- `latency_p95_gt` - P95 延迟大于（ms）
- `latency_p99_gt` - P99 延迟大于（ms）
- `request_count_lt` - 请求数小于

### 严重程度
- `critical` - 严重
- `warning` - 警告
- `info` - 信息

### Webhook 通知

当告警触发时，系统会向配置的 Webhook URL 发送 POST 请求，数据格式如下：

```json
{
  "id": "告警ID",
  "ruleId": "规则ID",
  "ruleName": "规则名称",
  "serviceName": "服务名称",
  "condition": "error_rate_gt",
  "threshold": 5,
  "currentValue": 8.5,
  "severity": "warning",
  "message": "Service api-gateway error rate 8.5% exceeds threshold 5%",
  "createdAt": 1234567890000
}
```

## 存储扩展

当前实现使用内存存储，生产环境建议：

### Jaeger 集成
```javascript
// 可替换 storage.js 中的实现
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
```

### Elasticsearch 集成
```javascript
// 可替换 storage.js 中的实现
const { Client } = require('@elastic/elasticsearch');
```

## 技术栈

**后端：**
- Node.js + Express
- Axios（Webhook 通知）
- UUID

**前端：**
- React 18
- React Router
- Recharts（图表）
- Vite（构建工具）

## 更新日志

### v1.1.0

**🔧 优化：**
1. **数据一致性修复** - 错误追踪查询统一使用 5 分钟时间窗口，与拓扑图指标保持一致
2. **告警冷却时间可配置** - 每条规则可独立设置冷却时间（10秒至30分钟）
3. **规则更新立即生效** - 修改告警规则后自动清除冷却时间，新规则立即生效
4. **代码重构** - 提取公共函数 `getServiceName()` 和 `isErrorSpan()`，消除重复代码

## 许可证

MIT
