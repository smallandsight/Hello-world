# ============================================================
# 古月租车 - NestJS 服务端 Dockerfile
# 多阶段构建：开发镜像 + 生产镜像
# ============================================================

# ==================== 阶段1: 基础依赖安装 ====================
FROM node:20-alpine AS base

# 安装必要的系统依赖（native addon编译）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc-dev \
    && npm config set registry https://registry.npmmirror.com/

WORKDIR /app

# ==================== 阶段2: 开发环境 (支持热重载) ====================
FROM base AS development

# 安装所有依赖（含devDependencies）
COPY package.json package-lock.json* ./
RUN npm ci --include=dev && npm cache clean --force

# 复制源代码
COPY . .

# 开放端口和日志目录
EXPOSE 3000
RUN mkdir -p logs

# 热重载开发模式
CMD ["npm", "run", "start:dev"]

# ==================== 阶段3: 生产构建 ====================
FROM base AS builder

COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

COPY . .
RUN npm run build

# ==================== 阶段4: 生产运行（最小化镜像） ====================
FROM node:20-alpine AS production

RUN apk add --no-cache curl && npm config set registry https://registry.npmmirror.com/'

WORKDIR /app

# 从builder阶段复制产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/migrations ./migrations

# 创建非root用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app /tmp
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/v1/health || exit 1

CMD ["node", "dist/main.js"]
