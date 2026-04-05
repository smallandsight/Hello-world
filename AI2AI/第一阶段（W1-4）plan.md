## 产品概述

按照《开发计划》第一阶段（W1-4），在 `D:\project\gy_bike\Basic\server\` 目录下从零搭建 NestJS 后端项目。参考后端接口文档、软件框架设计文档、数据库设计DDL（20张表）和需求分析文档，完成完整的第一阶段基础架构编码。

## 核心交付物

1. **NestJS 项目初始化** — 可运行的后端服务骨架
2. **公共模块（Common）** — 守卫/过滤器/拦截器/装饰器/中间件
3. **TypeORM 实体层** — 20张表的 Entity 定义 + BaseEntity 基类
4. **业务模块骨架** — 10个模块的 Module/Controller/Service/DTO 骨架代码
5. **Redis 服务封装** — 缓存/分布式锁/限流
6. **共享类型定义** — 前后端共用 TypeScript 类型

## 功能范围

### 公共基础设施（T1.3.1 - T1.3.8）

- 统一异常处理过滤器 + 错误码枚举（9大类 30+错误码）
- JWT 认证守卫（用户端7天/商家端2天双Token策略）
- RBAC 权限守卫（角色+数据权限范围）
- 统一响应格式拦截器（{code, message, data, timestamp}）
- 分页 DTO / 响应 DTO / 自定义装饰器（@CurrentUser @Permissions）
- 请求日志中间件（NestJS Logger 封装）
- TypeORM 配置 + BaseEntity（审计字段/软删除）
- Redis 模块封装（连接池/get/set/del/ttl/分布式锁）

### 业务模块骨架（含Entity定义）

| 模块 | Entity文件 | 核心内容 |
| --- | --- | --- |
| user | users, driver_licenses, user_levels | 用户聚合实体 |
| vehicle | stores, vehicle_models, vehicles, vehicle_images, vehicle_maintenance | 车辆聚合实体 |
| order | orders, order_logs | 订单聚合实体+状态机枚举 |
| payment | payments, preauths, refunds | 支付聚合实体 |
| coupon | coupons, user_coupons, points_records | 营销聚合实体 |
| ticket | tickets, ticket_replies | 工单聚合实体 |
| staff | roles, permissions, staff, role_permissions, staff_roles | 权限RBAC实体 |
| message | message_log | 消息日志实体 |


### 不包含（后续阶段）

- 不实际连接数据库（纯代码层面，配置通过 .env 注入）
- 不实现具体业务逻辑（Service 方法体返回 stub）
- 不对接第三方支付宝/高德等API

## Tech Stack

- **框架**: NestJS ^10.0 + TypeScript ^5.x (strict)
- **ORM**: TypeORM ^0.3.x
- **数据库**: MySQL 8.0+（配置层面，不实际连接）
- **缓存**: Redis 7.x（ioredis 封装）
- **验证**: class-validator ^0.14 + class-transformer
- **文档**: Swagger/OpenAPI ^7.x (@nestjs/swagger)
- **日志**: NestJS Logger + Winston（可选）
- **工具库**: dayjs（日期）、crypto-js（加密）、uuid（ID生成）、class-validator-validator（DTO校验）

## Implementation Approach

采用**自底向上**的搭建顺序：先搭项目骨架和配置 → 再建公共基础设施 → 然后逐模块生成Entity和骨架代码 → 最后组装 AppModule。所有 Entity 字段严格对照 DDL 文档的 20 张表结构，确保字段名（snake_case→camelCase）、类型映射（DECIMAL(10,2)→number/BIGINT金额分→number）与 DDL 一致。公共模块遵循 NestJS 最佳实践：全局注册 Filter/Guard/Middleware/Interceptor；业务模块按DDD分层但保持 NestJS 约定风格。

### 关键技术决策

1. **BaseEntity 抽象类**：统一 id/createdAt/updatedAt/deletedAt/createdBy/updatedBy 七个审计字段，所有 Entity 继承
2. **响应包装器**：ApiResponse<T> 泛型 + Pagination<T> 分页泛型，全局 ResponseInterceptor 自动包装
3. **错误码枚举**：ErrorCode 枚举对象，HttpExceptionFilter 按 code 匹配返回对应 HTTP 状态码和信息
4. **JWT 双 Token**：AccessToken（短期）+ RefreshToken（长期），Payload 含 userType 区分用户端/商家端
5. **Redis 封装**：单例 RedisService 提供 get/set/del/ttl/incr/decr/hset/hgetall 等原子操作 + acquireLock/releaseLock 分布式锁
6. **DTO 分层**：CreateDto / UpdateDto / QueryDto（分页/筛选），使用 class-validator 装饰器做声明式校验
7. **模块懒加载**：各业务模块通过 FeatureModule 动态注册到 AppModule，避免启动时全量加载

### 性能与可靠性考虑

- Redis 连接池默认 10 个连接，支持自定义
- 数据库连接池 TypeORM 默认配置，生产环境可调优
- 日志级别可通过 .env 动态调整
- 所有异步操作使用 async/await，避免回调地狱

## Architecture Design

```
server/src/
├── main.ts                          # 应用入口（async bootstrap）
├── app.module.ts                    # 根模块（动态导入所有FeatureModule）
│
├── common/                         # 全局公共模块（GlobalModule）
│   ├── common.module.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # @CurrentUser() 从req提取用户
│   │   └── permissions.decorator.ts     # @Permissions('order:view')
│   ├── filters/
│   │   ├── http-exception.filter.ts      # 全局异常捕获 → 统一格式
│   │   └── query-exception.filter.ts     # TypeORM查询异常处理
│   ├── interceptors/
│   │   ├── response.interceptor.ts       # {code:0,data:{},timestamp}
│   │   └── logging.interceptor.ts        # 请求/响应耗时日志
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # 用户端JWT认证
│   │   ├── staff-auth.guard.ts          # 商家端认证
│   │   └── roles.guard.ts              # RBAC权限检查
│   ├── middleware/
│   │   └── logger.middleware.ts         # 请求日志(NestJS Logger)
│   ├── dto/
│   │   ├── response.dto.ts             # ApiResponse / PaginatedResponse
│   │   ├── pagination.dto.ts           # PageQueryDto (page/size/sort)
│   │   └── error-code.enum.ts           # ErrorCode枚举定义
│   └── constants/
│       ├── error-code.constants.ts     # 错误码常量表
│       └── status-code.constants.ts     # HTTP状态码映射
│
├── config/                          # 配置管理（ConfigModule）
│   ├── config.module.ts
│   ├── database.config.ts            # TypeORM配置（MySQL）
│   ├── redis.config.ts              # ioredis配置
│   └── app.config.ts                # 应用配置（端口/CORS/Swagger）
│
├── shared/                          # 共享类型（前后端共用）
│   ├── types/
│   │   ├── index.ts                 # 统一导出
│   │   ├── common.types.ts           # ApiResponse/Pagination/IPageResult
│   │   ├── user.types.ts            # UserInfo/IPayload/StaffPayload
│   │   ├── order.types.ts           # OrderStatus/OrderStateTransitions
│   │   └── vehicle.types.ts         # VehicleStatus/VehicleType枚举
│   └── utils/
│       ├── date.util.ts             # dayjs日期工具
│       ├── crypto.util.ts           # AES加密/解密（身份证等敏感信息）
│       └── pagination.util.ts       # 分页计算工具
│
├── modules/                         # 业务模块目录
│   ├── auth/                          # [FeatureModule] 认证模块
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts          # POST /auth/alipay/login, /auth/staff/login
│   │   ├── auth.service.ts           # 登录逻辑/JWT签发/刷新/登出
│   │   ├── dto/
│   │   │   ├── alipay-login.dto.ts
│   │   │   ├── staff-login.dto.ts
│   │   │   └── refresh-token.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts      # Passport-JWT策略
│   │
│   ├── user/                          # [FeatureModule] 用户模块
│   │   ├── user.module.ts
│   │   ├── user.controller.ts         # GET/PUT /user/info, GET /user/member/info 等
│   │   ├── user.service.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts         # ← BaseEntity
│   │   │   ├── driver-license.entity.ts
│   │   │   └── user-level.entity.ts
│   │   └── dto/
│   │       ├── update-user.dto.ts
│   │       └── upload-license.dto.ts
│   │
│   ├── vehicle/                       # [FeatureModule] 车辆模块
│   │   ├── vehicle.module.ts
│   │   ├── vehicle.controller.ts
│   │   ├── vehicle.service.ts
│   │   ├── entities/
│   │   │   ├── store.entity.ts
│   │   │   ├── vehicle-model.entity.ts
│   │   │   ├── vehicle.entity.ts
│   │   │   ├── vehicle-image.entity.ts
│   │   │   └── vehicle-maintenance.entity.ts
│   │   └── dto/
│   │       ├── query-vehicle.dto.ts
│   │       └── create-vehicle.dto.ts
│   │
│   ├── order/                         # [FeatureModule] 订单模块
│   │   ├── order.module.ts
│   │   ├── order.controller.ts
│   │   ├── order.service.ts
│   │   ├── pricing.service.ts          # 定价引擎（时段系数*会员折扣）
│   ├── entities/
│   │   │   ├── order.entity.ts
│   │   │   └── order-log.entity.ts
│   │   ├── state-machine/
│   │   │   ├── order-state.enum.ts      # 10-80状态枚举
│   │   │   └── state-machine.ts         # 状态转换规则
│   │   └── dto/
│   │       ├── create-order.dto.ts
│   │       ├── calculate-price.dto.ts
│   │       └── pickup.dto.ts
│   │
│   ├── payment/                       # [FeatureModule] 支付模块
│   │   ├── payment.module.ts
│   │   ├── payment.controller.ts
│   │   ├── payment.service.ts
│   │   ├── alipay.service.ts          # 支付宝SDK适配（接口预留）
│   │   ├── entities/
│   │   │   ├── payment.entity.ts
│   │   │   ├── preauth.entity.ts
│   │   │   └── refund.entity.ts
│   │   └── dto/
   │
   │   ├── store/                         # [FeatureModule] 门店模块（vehicle子模块或独立）
│   │
│   ├── coupon/                        # [FeatureModule] 营销模块
│   │   ├── coupon.module.ts
│   │   ├── entities/
│   │   │   ├── coupon.entity.ts
│   │   │   ├── user-coupon.entity.ts
│   │   │   └── points-record.entity.ts
│   │   └── dto/
   │
│   ├── ticket/                        # [FeatureModule] 客服工单模块
│   │   ├── ticket.module.ts
│   │   ├── entities/
│   │   │   ├── ticket.entity.ts
│   │   │   └── ticket-reply.entity.ts
│   │   └── dto/
   │
│   ├── staff/                         # [FeatureModule] 权限管理模块
│   │   ├── staff.module.ts
│   │   ├── staff.controller.ts
│   │   ├── staff.service.ts
│   │   ├── entities/
│   │   │   ├── role.entity.ts
│   │   │   ├── permission.entity.ts
│   │   │   ├── staff.entity.ts
│   │   │   ├── role-permission.entity.ts
│   │   │   └── staff-role.entity.ts
│   │   └── dto/
   │
│   └── message/                       # [FeatureModule] 消息推送模块
│       ├── message.module.ts
│       ├── entities/
│       │   └── message-log.entity.ts
│       └── dto/
│
├── database/                        # 数据库相关
│   ├── migrations/                  # TypeORM 迁移文件占位
│   └── seeds/                       # 种子数据SQL占位
│
├── test/                            # 测试目录
│   ├── e2e/
│   └── app.e2e-spec.ts
│
├── package.json
├── tsconfig.json                     # strict模式, experimentalDecorators, emitMetadataOnly
├── nest-cli.json                      # sourceRoot: src
└── .env.example                      # 环境变量模板
```

## Directory Structure Summary

本实现将在 `D:\project\gy_bike\Basic\server\` 下创建完整的 NestJS 项目。核心产出包括：1个根模块 + 1个公共模块(Global) + 10个业务FeatureModule + 1个配置模块 + 1个共享类型目录。每个业务模块包含完整的 Module/Controller/Service/Entity/DTO 四件套结构，Entity 层严格对应 DDL 的 20 张表。

## 设计说明

本项目为**纯后端 API 服务**，不涉及前端 UI 页面设计。设计重点在于代码架构的规范性、模块划分的清晰度、以及代码的可维护性。

## 设计风格

采用 **企业级 NestJS 标准架构风格**，强调：

- **代码规范**：ESLint + Prettier，strict 模式 TypeScript
- **命名约定**：文件名 kebabab-case，类名 PascalCase，变量/方法 camelCase，常量 UPPER_SNAKE_CASE
- **注释规范**：JSDoc 风格，每个公开方法必须有注释
- **分层清晰**：Controller 只做参数校验和调用 Service；Service 只做业务逻辑；Entity 只负责数据映射
- **依赖注入**：通过 constructor 注入，便于测试

## 关键设计约定

1. **Entity 字段映射规则**：DDL snake_case → TS camelCase（如 `alipay_user_id` → `alipayUserId`，`created_at` → `createdAt`）
2. **金额字段**：DDL 中 BIGINT（分）→ TS 中 number，Service 层做分↔元转换
3. **状态枚举**：DDL TINYINT → TS enum，如 OrderStatus.PENDING_PAYMENT = 10
4. **JSON 字段**：DDL JSON → TS object type 或 any（TypeORM column type: 'json'）
5. **软删除**：BaseEntity 统一提供 deletedAt，查询时自动过滤
6. **时间精度**：DATETIME(3) → Date 对象，毫秒精度保留