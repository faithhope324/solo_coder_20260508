# 在线投票/调查统计平台

基于 Django 构建的在线投票和调查统计平台，支持单题投票和多题调查，具备实时统计、二维码分享和防刷票机制。

## 功能特性

- **创建投票**：支持单题投票和多题调查两种类型
- **问题管理**：支持单选题和多选题，可动态添加选项
- **截止时间**：可设置投票截止时间，超时自动关闭
- **二维码分享**：自动生成投票链接的二维码，方便分享
- **实时统计**：投票结果实时更新，支持每10秒自动刷新
- **详细统计**：
  - 每个选项的票数和百分比
  - 按地区分组统计
  - 按年龄段分组统计
- **防刷票机制**：
  - IP 限制（默认每天每IP只能投1票）
  - Session 限制（同一会话只能投1票）
  - 登录限制（可设置需要登录才能投票）
  - 用户限制（已登录用户只能投1票）

## 项目结构

```
poll_platform/
├── manage.py              # Django 管理脚本
├── requirements.txt       # 依赖包
├── init_data.py           # 示例数据初始化脚本
├── poll_platform/         # 项目配置
│   ├── settings.py        # 项目设置
│   ├── urls.py            # 主URL路由
│   └── wsgi.py            # WSGI配置
└── polls/                 # 投票应用
    ├── models.py          # 模型层 (Poll, Question, Option, VoteRecord, IPLimit)
    ├── views.py           # 视图层 (投票逻辑)
    ├── forms.py           # 表单
    ├── urls.py            # URL路由
    ├── statistics.py      # 结果统计模块
    ├── qr_generator.py    # 二维码生成模块
    ├── middleware.py      # 防刷中间件
    ├── admin.py           # 后台管理配置
    └── migrations/        # 数据库迁移
templates/                 # 模板文件
static/                    # 静态文件
media/                     # 媒体文件（二维码等）
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 数据库迁移

```bash
python manage.py makemigrations polls
python manage.py migrate
```

### 3. 初始化示例数据（可选）

```bash
python init_data.py
```

这会创建：
- 超级用户：admin / admin123456
- 两个示例投票

### 4. 运行开发服务器

```bash
python manage.py runserver
```

访问 http://127.0.0.1:8000/ 查看效果

### 5. 后台管理

访问 http://127.0.0.1:8000/admin/

使用刚才创建的超级用户登录。

## 配置说明

在 `settings.py` 中可以调整以下配置：

```python
# 防刷票配置
ANTI_CHEAT_IP_LIMIT = 1           # 每个IP在时间窗口内可投票次数
ANTI_CHEAT_TIME_WINDOW = 86400    # 时间窗口（秒），默认24小时
```

## 核心模块说明

### 模型层 (models.py)
- `Poll`：投票主表，包含标题、类型、截止时间等
- `Question`：问题表，关联到投票
- `Option`：选项表，关联到问题
- `VoteRecord`：投票记录表，记录每一票的详细信息
- `IPLimit`：IP限制表，用于防刷票

### 投票逻辑 (views.py + forms.py)
- 投票创建流程：创建投票 → 添加问题和选项 → 生成二维码
- 投票提交流程：权限检查 → 防刷检查 → 记录投票 → 跳转结果页

### 结果统计 (statistics.py)
- `get_poll_statistics(poll)`：获取投票的完整统计数据
- 包含总体统计、各问题统计、按地区/年龄段分组统计

### 二维码生成 (qr_generator.py)
- `generate_qr_code(poll, request)`：生成投票链接的二维码图片

### 防刷中间件 (middleware.py)
- `AntiCheatMiddleware`：为每个请求生成唯一Session ID
- 提供IP限制、Session限制、用户限制的检查方法

## API接口

- `GET /poll/<poll_id>/api/`：获取投票结果JSON数据
- `GET /poll/<poll_id>/qr/`：生成并返回二维码URL

## License

MIT
