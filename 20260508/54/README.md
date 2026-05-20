# 云成本优化分析系统

一个完整的云成本优化分析系统，支持从云厂商账单API获取数据，展示成本分析图表，提供节省建议，并支持导出月度账单报告。

## 功能特性

### 1. 成本概览
- **统计卡片**：展示近30天总花费、日均花费、云资源实例数、可节省金额
- **成本趋势面积图**：展示近30天ECS/RDS/OSS各服务的每日花费趋势
- **服务分布饼图**：按服务类型（ECS/RDS/OSS）展示成本占比
- **标签柱状图**：按环境（生产/测试/开发）和部门维度展示成本分布

### 2. 节省建议
- **闲置实例优化**：识别CPU使用率低于15%的闲置ECS实例
- **已停止实例清理**：发现已停止但仍产生费用的实例
- **预留实例推荐**：针对长期运行实例推荐预留实例（节省约30%）
- **OSS存储优化**：针对大量存储数据推荐生命周期策略
- **RDS实例降配**：识别低使用率的RDS实例建议降配

### 3. 账单报告
- 支持按月份查看详细账单
- 展示服务类型、环境、部门多维度成本分析
- 支持导出CSV格式月度账单报告

## 技术栈

### 后端
- Node.js + Express
- 模拟云厂商账单数据（可对接真实API）
- CSV导出功能

### 前端
- React 18 + Vite
- Ant Design 组件库
- ECharts 图表库
- Axios HTTP客户端

## 项目结构

```
cloud-cost-optimization/
├── backend/                    # 后端服务
│   ├── data/
│   │   └── mockData.js        # 模拟数据生成
│   ├── services/
│   │   └── costAnalyzer.js    # 成本分析服务
│   ├── exports/               # 导出文件目录
│   ├── server.js              # Express服务器
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── StatCard.jsx
│   │   │   ├── CostTrendChart.jsx
│   │   │   ├── ServicePieChart.jsx
│   │   │   └── TagBarChart.jsx
│   │   ├── pages/             # 页面
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Savings.jsx
│   │   │   └── Reports.jsx
│   │   ├── services/          # API服务
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json               # 根目录配置
```

## 快速开始

### 前置要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

或者分别安装：

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动服务

#### 方式一：同时启动前后端（推荐）

```bash
npm run dev
```

#### 方式二：分别启动

```bash
# 启动后端服务 (端口 3001)
npm run dev:backend

# 启动前端服务 (端口 5173)
npm run dev:frontend
```

### 访问应用

- 前端应用：http://localhost:5173
- 后端API：http://localhost:3001
- 健康检查：http://localhost:3001/api/health

## API接口文档

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/summary` | GET | 获取成本汇总数据 |
| `/api/cost-trend` | GET | 获取成本趋势数据 |
| `/api/service-distribution` | GET | 获取服务分布数据 |
| `/api/cost-by-environment` | GET | 按环境统计成本 |
| `/api/cost-by-department` | GET | 按部门统计成本 |
| `/api/savings-suggestions` | GET | 获取节省建议 |
| `/api/monthly-report` | GET | 获取月度报告 |
| `/api/export/monthly-report` | GET | 导出月度CSV报告 |

## 对接真实云厂商API

当前系统使用模拟数据，如需对接真实云厂商API，请修改 `backend/data/mockData.js`：

### 阿里云
```javascript
// 集成阿里云BSS OpenAPI
const Core = require('@alicloud/pop-core');
// ... 调用 QueryBill 接口
```

### AWS
```javascript
// 集成AWS Cost Explorer
const AWS = require('aws-sdk');
// ... 调用 getCostAndUsage 接口
```

## 构建部署

```bash
# 构建前端
npm run build

# 启动生产服务
npm start
```

## License

MIT
