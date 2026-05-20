# 游戏玩家流失预测系统

基于随机森林模型的智能流失预警与干预平台。

## 功能特性

- **流失预测**: 使用随机森林模型基于玩家行为特征预测流失概率
- **风险分级**: 自动将玩家分为高/中/低三个风险等级
- **特征可视化**: 雷达图展示玩家多维行为特征
- **智能筛选**: 支持按风险等级筛选、搜索玩家
- **批量干预**: 对高风险玩家执行批量运营干预
- **个性化建议**: 根据玩家特征自动生成运营建议

## 技术栈

### 后端
- Python 3.8+
- Flask (Web 框架)
- scikit-learn (机器学习)
- pandas / numpy (数据处理)

### 前端
- 原生 HTML/CSS/JavaScript
- Chart.js (雷达图可视化)

## 目录结构

```
├── backend/
│   ├── app.py              # Flask API 主程序
│   ├── churn_model.py      # 随机森林预测模型
│   ├── data_generator.py   # 玩家数据生成
│   └── requirements.txt    # Python 依赖
└── frontend/
    ├── index.html          # 前端页面
    ├── style.css           # 样式文件
    └── app.js              # 前端逻辑
```

## 快速开始

### 1. 启动后端服务

```bash
cd backend
pip install -r requirements.txt
python app.py
```

后端服务将在 `http://localhost:5000` 启动

### 2. 打开前端页面

直接在浏览器中打开 `frontend/index.html`

或者使用简单的 HTTP 服务器：

```bash
cd frontend
python -m http.server 8000
```

然后访问 `http://localhost:8000`

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/players` | GET | 获取玩家列表（支持分页、筛选、搜索） |
| `/api/players/{id}` | GET | 获取玩家详细信息 |
| `/api/statistics` | GET | 获取统计数据 |
| `/api/intervene` | POST | 执行批量干预 |
| `/api/feature-importance` | GET | 获取特征重要性 |
| `/api/health` | GET | 健康检查 |

## 模型说明

### 输入特征（9维）
1. 7日登录次数
2. 总游戏时长（小时）
3. 累计充值金额
4. 关卡进度（%）
5. 活跃天数
6. 社交关系数
7. 购买次数
8. 距上次登录天数
9. 任务完成率（%）

### 模型参数
- 算法: RandomForestClassifier
- 树数量: 100
- 最大深度: 10
- 类别权重: balanced（处理类别不平衡）

## 风险等级

- **高风险**: 流失概率 ≥ 70%
- **中风险**: 流失概率 40% ~ 70%
- **低风险**: 流失概率 < 40%

## 干预类型

- **消息推送**: 召回推送
- **优惠券**: 专属充值优惠券
- **活动邀请**: 限定活动邀请
- **新手引导**: 新手训练营推荐
- **社交活动**: 好友邀请活动
- **VIP服务**: 专属客服服务
