# 数据库慢查询分析系统

一个用于分析 MySQL 和 PostgreSQL 慢查询的全栈应用。

## 功能特性

- 🔍 **多数据源支持**：支持从 MySQL slow_log/performance_schema 和 PostgreSQL 日志/pg_stat_statements 采集慢查询
- 📊 **可视化展示**：
  - 慢查询列表（SQL 文本、执行时间、锁等待时间等）
  - 饼图展示 SQL 类型分布（SELECT/UPDATE/DELETE/INSERT）
  - 统计概览（总查询数、平均/最大执行时间）
- 🔎 **多维度筛选**：按数据库类型、数据库名称、SQL 类型、时间范围筛选
- 📋 **执行计划分析**：点击查看任意 SQL 的 EXPLAIN 执行计划
- ⚡ **实时采集**：支持手动和定时自动采集

## 技术栈

### 后端
- Node.js + Express
- Elasticsearch 8.x（数据存储）
- MySQL2（MySQL 客户端）
- pg（PostgreSQL 客户端）

### 前端
- Vue 3（响应式框架）
- ECharts（图表可视化）
- Bootstrap 5（UI 样式）

## 项目结构

```
.
├── server.js                 # API 服务端
├── collector.js              # 采集调度脚本
├── package.json              # 项目依赖
├── .env                      # 环境配置
├── .env.example              # 配置示例
├── services/
│   ├── elasticsearch.js      # Elasticsearch 服务
│   ├── mysqlCollector.js     # MySQL 采集器
│   └── postgresqlCollector.js # PostgreSQL 采集器
└── public/
    └── index.html            # 前端页面
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并根据实际情况修改：

```bash
cp .env.example .env
```

主要配置项：
- `ES_HOST`：Elasticsearch 地址
- `MYSQL_*`：MySQL 连接配置
- `PG_*`：PostgreSQL 连接配置

### 3. 启动 Elasticsearch

确保 Elasticsearch 8.x 已安装并运行。

使用 Docker 快速启动：
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

### 4. 启动服务

```bash
npm start
```

服务将在 http://localhost:3000 启动

### 5. 生成测试数据（可选）

打开浏览器访问 http://localhost:3000，点击「生成测试数据」按钮，或使用 API：

```bash
curl -X POST http://localhost:3000/api/generate-test-data
```

## 使用说明

### 开启 MySQL 慢查询日志

在 MySQL 中执行以下 SQL 开启慢查询日志：

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过 1 秒记录
SET GLOBAL log_output = 'TABLE';
```

查看配置：
```sql
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

### 开启 PostgreSQL 慢查询日志

修改 `postgresql.conf`：

```ini
shared_preload_libraries = 'pg_stat_statements'
log_min_duration_statement = 1000  # 超过 1000ms 记录
log_destination = 'csvlog'
logging_collector = on
log_directory = 'pg_log'
```

重启 PostgreSQL 后生效。

启用 pg_stat_statements 扩展：
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 慢查询采集

#### 手动采集（单次）

```bash
# 采集 MySQL slow_log
node collector.js --type mysql --source slow_log

# 采集 MySQL performance_schema
node collector.js --type mysql --source performance_schema

# 采集 PostgreSQL 日志目录
node collector.js --type postgresql --source log_directory

# 采集 PostgreSQL pg_stat_statements
node collector.js --type postgresql --source pg_stat_statements
```

#### 守护进程模式（定时采集）

```bash
# 每 60 秒采集一次 MySQL
node collector.js --type mysql --daemon --interval 60000
```

也可以在前端页面点击「采集 MySQL 慢查询」或「采集 PostgreSQL 慢查询」按钮手动触发采集。

## API 接口

### 健康检查
```
GET /api/health
```

### 查询慢查询列表
```
GET /api/queries
参数:
  - dbType: mysql | postgresql
  - database: 数据库名
  - sqlType: SELECT | UPDATE | DELETE | INSERT | OTHER
  - startTime: 开始时间 (ISO 格式)
  - endTime: 结束时间 (ISO 格式)
  - page: 页码，默认 1
  - pageSize: 每页数量，默认 20
```

### 获取统计信息
```
GET /api/stats
参数: 同上（不含分页）
```

### 获取数据库列表
```
GET /api/databases
参数:
  - dbType: mysql | postgresql (可选)
```

### 执行计划分析
```
POST /api/explain
Body:
{
  "sql": "SELECT * FROM users WHERE id = 1",
  "dbType": "mysql",
  "database": "test"
}
```

### 手动触发采集
```
POST /api/collect
Body:
{
  "type": "mysql",
  "source": "slow_log",
  "limit": 1000
}
```

### 生成测试数据
```
POST /api/generate-test-data
```

## 数据模型

存储在 Elasticsearch 中的文档结构：

```json
{
  "id": "唯一标识",
  "db_type": "mysql | postgresql",
  "database": "数据库名",
  "sql_text": "SQL 语句",
  "sql_type": "SELECT | UPDATE | DELETE | INSERT | OTHER",
  "execution_time": 2.345,
  "lock_wait_time": 0.123,
  "rows_sent": 100,
  "rows_examined": 10000,
  "host": "数据库主机",
  "user": "数据库用户",
  "start_time": "2024-01-01T00:00:00.000Z",
  "created_at": "2024-01-01T00:00:00.000Z",
  "checksum": "MD5校验和"
}
```

## 常见问题

### 1. Elasticsearch 连接失败
- 检查 Elasticsearch 是否正常运行
- 确认 `.env` 中的 `ES_HOST` 配置正确
- 如果启用了安全认证，需要配置 `ES_USER` 和 `ES_PASSWORD`

### 2. 采集不到慢查询
- 确认已开启慢查询日志
- 检查 `long_query_time` 配置，可能设置得太高
- 确认数据库中有执行时间超过阈值的查询

### 3. EXPLAIN 失败
- 确认 SQL 语句语法正确
- 检查数据库用户是否有执行权限
- 确认目标数据库存在

## License

MIT
