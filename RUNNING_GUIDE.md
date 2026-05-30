# 古月租车 — 运行环境搭建指南

> 适用平台：Windows / macOS / Linux  
> 最后更新：2026-05-24

---

## 一、环境要求

| 组件 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥18.x (推荐 20 LTS) | 后端 + 前端运行 |
| npm | ≥9.x | 包管理 |
| MySQL | 8.0+ | 业务数据存储 |
| Redis | 7.x | 缓存/会话/限流/分布式锁 |
| Docker (可选) | 最新稳定版 | 一键启动 MySQL + Redis |

---

## 二、快速启动（Docker + 后端）

### Step 1 — 启动 MySQL 和 Redis

```bash
cd D:\project\gy_bike

# 启动 MySQL 8.0 + Redis 7
docker-compose up -d

# 验证服务已启动
docker ps
# 应看到 gy-bike-mysql 和 gy-bike-redis 两个容器
```

### Step 2 — 初始化数据库

```bash
# 方式A：Docker 会自动执行 migrations 目录下的 SQL
# 如果未自动执行，手动导入：

docker exec -i gy-bike-mysql mysql -uroot -proot123 gy_bike < Basic/server/database/migrations/V1__init_schema.sql
```

或者用 MySQL 客户端工具（Navicat / DBeaver / MySQL Workbench）连接 `localhost:3306`，用户 `root`，密码 `root123`，执行 `Basic/server/database/migrations/V1__init_schema.sql`。

### Step 3 — 启动后端

```bash
cd D:\project\gy_bike\Basic\server

# 首次运行需安装依赖
npm install

# 开发模式启动（热重载）
npm run start:dev
```

看到以下日志表示启动成功：
```
[Nest] Starting Nest application...
✅ Redis 连接成功
TypeOrmModule dependencies initialized
Nest application successfully started
```

### Step 4 — 验证服务

```bash
# 健康检查
curl http://localhost:3000/v1/health

# Swagger 文档
# 浏览器打开: http://localhost:3000/api-docs
```

---

## 三、手动安装 MySQL + Redis（无 Docker）

### MySQL 8.0

1. 下载安装：https://dev.mysql.com/downloads/mysql/8.0.html
2. 安装时设置 root 密码为 `root123`（或修改 `.env` 中的 `DB_PASSWORD`）
3. 创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS `gy_bike`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

4. 导入表结构：

```bash
mysql -uroot -proot123 gy_bike < Basic/server/database/migrations/V1__init_schema.sql
```

### Redis 7.x

**Windows:**
- 下载 Redis for Windows：https://github.com/tporadowski/redis/releases
- 或使用 `winget install Redis`

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

---

## 四、配置文件说明

后端配置在 `Basic/server/.env`（已提供默认值）：

```ini
# 基础
NODE_ENV=development
APP_PORT=3000

# 数据库 — 需与 MySQL 安装配置一致
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root123          # 改成你的密码
DB_DATABASE=gy_bike

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=              # 留空表示无密码

# JWT — 生产环境务必更换
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_USER_EXPIRES_IN=7d       # 用户 Token 7 天
JWT_STAFF_EXPIRES_IN=2d      # 商家 Token 2 天

# 第三方服务（开发阶段可不填，使用 Mock）
# ALIPAY_APP_ID=              # 支付宝 AppID
# ALIYUN_SMS_ACCESS_KEY_ID=   # 短信 AccessKey
# 等等...
```

> **注意**：未配置支付宝/短信/OSS/高德密钥时，相关服务会自动降级为 Mock 模式，不影响核心流程开发。

---

## 五、启动前端

### 小程序端（uni-app）

```bash
cd D:\project\gy_bike\Basic\miniprogram

# 安装依赖
npm install

# 开发模式（H5 预览）
npm run dev:h5

# 编译到微信小程序
npm run dev:mp-weixin

# 编译到支付宝小程序
npm run dev:mp-alipay
```

### 商家后台（Vue3 + Element Plus）

```bash
cd D:\project\gy_bike\Basic\admin

# 安装依赖
npm install

# 开发模式
npm run dev
# 默认打开 http://localhost:5173
```

商家后台默认管理员账号：`admin` / `Gy@2026init`

---

## 六、项目目录结构

```
gy_bike/
├── docker-compose.yml          # MySQL + Redis 一键启动
├── RUNNING_GUIDE.md            # 本文档
├── CLAUDE.md                   # 项目架构说明
├── Basic/
│   ├── server/                 # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/        # 25 个业务模块
│   │   │   ├── common/         # 公共基础设施
│   │   │   ├── config/         # 配置
│   │   │   └── shared/         # 共享类型
│   │   ├── database/migrations/# 数据库迁移 SQL
│   │   ├── .env                # 环境变量
│   │   └── package.json
│   ├── miniprogram/            # uni-app 小程序（28 页面）
│   └── admin/                  # Vue3 商家后台（20 页面）
├── AI2AI/                      # 设计文档
│   ├── 古月租车小程序_后端接口文档.md
│   ├── 古月租车小程序_数据库设计.md
│   └── ...
└── ME2AI/                      # 需求文档
    └── 需求分析文档.md
```

---

## 七、常用命令速查

```bash
# === 后端 ===
cd Basic/server

npm run start:dev          # 开发模式（热重载）
npm run start:debug        # 调试模式
npm run build              # 编译
npm run start:prod         # 生产模式
npm run test               # 运行单元测试
npm run test:cov           # 测试覆盖率
npm run lint               # ESLint 检查

# === Docker ===
docker-compose up -d       # 启动 MySQL + Redis
docker-compose down        # 停止
docker-compose logs -f     # 查看日志

# === 数据库 ===
# 连接 MySQL
mysql -h localhost -u root -proot123 gy_bike

# 重新导入表结构
docker exec -i gy-bike-mysql mysql -uroot -proot123 gy_bike < Basic/server/database/migrations/V1__init_schema.sql
```

---

## 八、常见问题

### Q: `npm install` 报错？

```bash
# 清除缓存重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Q: 启动报 "Unable to connect to the database"？

检查 MySQL 是否已启动：
```bash
docker ps | grep mysql    # Docker 方式
mysql -h localhost -u root -proot123 -e "SELECT 1"  # 手动验证
```

### Q: 启动报 "Redis 连接失败"？

检查 Redis 是否已启动：
```bash
docker ps | grep redis    # Docker 方式
redis-cli ping            # 手动验证，应返回 PONG
```

### Q: 端口被占用？

```bash
# Windows 查看端口占用
netstat -ano | findstr :3000

# 修改 .env 中的 APP_PORT 为其他端口
APP_PORT=3001
```

### Q: 支付宝登录不工作？

开发环境未配置支付宝密钥时，系统自动使用 Mock 数据。Mock 模式下登录会创建一个测试用户，不影响核心租车流程的开发测试。

---

## 九、开发工作流

```
1. docker-compose up -d              # 启动基础设施
2. cd Basic/server && npm run start:dev   # 启动后端
3. cd Basic/admin && npm run dev          # 启动商家后台
4. 浏览器打开 http://localhost:5173        # 商家管理界面
5. 浏览器打开 http://localhost:3000/api-docs  # Swagger API 文档
```
