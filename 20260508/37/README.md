# 医疗保险理赔分析前端

一个基于 React + TypeScript + Vite + ECharts 的医疗保险理赔数据可视化分析系统。

## 功能特性

- 📊 **理赔金额分布直方图** - 展示不同金额区间的理赔人数分布
- 📈 **不同年龄段理赔率柱状图** - 分析各年龄段的理赔占比
- 🏥 **常见疾病 TOP10 条形图** - 展示高发疾病的理赔情况
- 💹 **年龄 vs 理赔金额散点图** - 分析年龄与理赔金额的相关性
- 🔍 **性别筛选器** - 支持按全部/男性/女性筛选数据
- 📋 **摘要卡片** - 实时显示总赔付金额、平均赔付额、理赔案件数

## 技术栈

- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **ECharts** - 图表库
- **echarts-for-react** - ECharts React 封装

## 项目结构

```
├── src/
│   ├── components/
│   │   ├── SummaryCard.tsx        # 摘要卡片组件
│   │   ├── GenderFilter.tsx       # 性别筛选器组件
│   │   ├── AmountHistogram.tsx    # 理赔金额分布直方图
│   │   ├── AgeGroupBarChart.tsx   # 年龄段理赔率柱状图
│   │   ├── TopDiseasesBarChart.tsx # 常见疾病TOP10条形图
│   │   └── AgeAmountScatter.tsx   # 年龄vs理赔金额散点图
│   ├── data/
│   │   └── mockData.ts            # 模拟数据及数据处理函数
│   ├── App.tsx                    # 主应用组件
│   ├── main.tsx                   # 入口文件
│   └── index.css                  # 全局样式
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 安装和运行

### 安装依赖

```bash
npm install
```

或者使用 yarn：

```bash
yarn install
```

### 启动开发服务器

```bash
npm run dev
```

或者使用 yarn：

```bash
yarn dev
```

访问 http://localhost:3000 查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 数据说明

项目使用模拟数据（2000条理赔记录），包含以下字段：

- id: 记录ID
- gender: 性别（男/女）
- age: 年龄
- amount: 理赔金额
- disease: 疾病类型
- ageGroup: 年龄段分组

## 组件说明

### 1. SummaryCard（摘要卡片）
展示关键指标数据，支持图标和后缀。

### 2. GenderFilter（性别筛选器）
提供"全部"、"男"、"女"三个筛选选项，点击后所有图表会实时更新。

### 3. AmountHistogram（理赔金额分布直方图）
将理赔金额分为7个区间（0-5千、5千-1万、1万-2万、2万-3万、3万-5万、5万-8万、8万以上），展示各区间的理赔人数。

### 4. AgeGroupBarChart（年龄段理赔率柱状图）
将人群分为7个年龄段（0-18、19-30、31-40、41-50、51-60、61-70、71+），展示各年龄段的理赔占比。

### 5. TopDiseasesBarChart（常见疾病TOP10条形图）
横向展示理赔次数最多的前10种疾病。

### 6. AgeAmountScatter（年龄vs理赔金额散点图）
以散点图形式展示每个理赔记录的年龄和金额分布，不同颜色区分性别。
