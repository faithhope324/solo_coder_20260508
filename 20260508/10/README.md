# Spark日志分析项目

## 项目概述

本项目使用Apache Spark（PySpark）处理大日志文件，计算每小时请求量、平均响应时间等指标，将结果保存到MySQL，再用Flask读取MySQL并展示统计图表。

## 项目结构

```
├── data/             # 数据目录
│   └── logs.csv      # 模拟日志数据
├── spark/            # Spark作业目录
│   └── process_logs.py  # Spark数据处理脚本
├── flask/            # Flask应用目录
│   ├── app.py        # Flask主应用
│   └── templates/    # 前端模板
│       └── index.html # 统计图表页面
├── config/           # 配置目录
│   └── init_db.sql   # MySQL初始化脚本
├── scripts/          # 脚本目录
│   └── generate_logs.py # 日志数据生成脚本
└── README.md         # 项目说明文档
```

## 环境要求

### 1. 系统环境
- Python 3.7+
- Java 8+
- MySQL 5.7+

### 2. 依赖包
- PySpark 3.0+
- Flask
- pymysql
- Chart.js (前端)
- Bootstrap (前端)

## 部署步骤

### 1. 安装依赖

```bash
# 安装Python依赖
pip install pyspark flask pymysql

# 下载MySQL JDBC驱动（用于Spark连接MySQL）
# 下载地址：https://dev.mysql.com/downloads/connector/j/
# 将下载的jar文件放在Spark的jars目录下
```

### 2. 初始化MySQL数据库

```bash
# 执行MySQL初始化脚本
mysql -u root -p < config/init_db.sql
```

### 3. 生成模拟日志数据

```bash
# 运行数据生成脚本
python scripts/generate_logs.py
```

### 4. 运行Spark作业

```bash
# 提交Spark作业
spark-submit --jars /path/to/mysql-connector-java.jar spark/process_logs.py
```

### 5. 启动Flask应用

```bash
# 进入Flask目录
cd flask

# 启动Flask应用
python app.py
```

## 运行说明

### 1. 数据生成
- 运行`scripts/generate_logs.py`生成100万条模拟日志数据
- 数据格式：CSV格式，包含timestamp、path、response_time、status_code字段

### 2. Spark作业
- 读取CSV数据，计算每小时请求量、平均响应时间、成功和错误请求数
- 将结果保存到MySQL的`log_metrics_hourly`和`log_metrics_path_hourly`表

### 3. Flask应用
- 启动后访问 `http://localhost:5000`
- 展示四个统计图表：
  - 每小时请求量
  - 每小时平均响应时间
  - 每小时成功和错误请求
  - 每小时按路径分组的请求量

## 注意事项

1. **MySQL配置**：默认使用`root`用户，密码为`password`，数据库名为`spark_logs`。如需修改，请修改`spark/process_logs.py`和`flask/app.py`中的配置。

2. **Spark配置**：确保Spark环境已正确配置，且MySQL JDBC驱动已添加到Spark的jars目录。

3. **端口占用**：Flask默认使用5000端口，确保该端口未被占用。

4. **数据量**：默认生成100万条日志数据，可根据需要修改`scripts/generate_logs.py`中的`num_records`参数。

## 技术栈

- **数据处理**：Apache Spark (PySpark)
- **数据存储**：MySQL
- **Web框架**：Flask
- **前端图表**：Chart.js
- **前端样式**：Bootstrap

## 项目扩展

1. **增加更多指标**：可在Spark作业中添加更多统计指标，如95%响应时间、按状态码分组的统计等。

2. **实时数据处理**：可使用Spark Streaming处理实时日志数据。

3. **数据可视化增强**：可添加更多图表类型，如饼图、热力图等。

4. **告警机制**：可添加基于阈值的告警功能，当请求量或错误率超过阈值时触发告警。