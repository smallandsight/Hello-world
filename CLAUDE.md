# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

古月租车 (GuYue Car Rental) — an Alipay mini-program platform for car rental services. Users browse/book vehicles via Alipay mini-program, merchants manage operations via a web admin panel.

- **Backend**: NestJS + TypeScript + TypeORM + MySQL 8.0 + Redis 7.x
- **Frontend (user)**: uni-app + Vue3 + Pinia (Alipay mini-program)
- **Frontend (admin)**: Vue3 + Vite + Element Plus
- **Architecture**: Modular monolith with DDD-inspired boundaries, single-developer project
- **Platform**: Alipay ecosystem (payment, auth, credit scoring)

## Commands

All backend commands run from `Basic/server/`:

```bash
cd Basic/server

# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger

# Build & production
npm run build              # Compile TypeScript
npm run start:prod         # Run compiled JS

# Testing
npm run test               # Unit tests (Jest)
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests

# Linting
npm run lint               # ESLint with auto-fix
```

## Backend Architecture

### Module structure (`Basic/server/src/`)

```
src/
├── main.ts                    # Bootstrap: helmet, CORS, ValidationPipe, Swagger, global prefix /v1
├── app.module.ts              # Root module — imports all FeatureModules, registers global filters/interceptors
├── config/                    # AppConfig (env vars), DatabaseConfig (TypeORM), RedisConfig
├── common/                    # @Global() CommonModule — infrastructure shared across all modules
│   ├── base.entity.ts         # Abstract base entity (id, createdAt, updatedAt, deletedAt, createdBy, updatedBy)
│   ├── guards/                # JwtAuthGuard (user Bearer token), StaffAuthGuard, RolesGuard
│   ├── interceptors/          # ResponseInterceptor (wraps all responses in {code, message, data, timestamp})
│   ├── filters/               # HttpExceptionFilter, QueryExceptionFilter
│   ├── decorators/            # @CurrentUser(), @Public(), @Roles()
│   ├── dto/                   # PageQueryDto (pagination: page/size/sort), ApiResponse, PaginatedResponse
│   └── redis/                 # RedisService (caching, distributed locks, sliding-window rate limiter)
├── modules/                   # Business feature modules — each follows NestJS module pattern
│   ├── auth/                  # JWT token issuance/refresh/blacklist, dual userType (user + staff)
│   ├── user/                  # User profile, driver license OCR verification, membership levels
│   ├── vehicle/               # Vehicle CRUD, images, maintenance records
│   ├── store/                 # Physical rental store management
│   ├── order/                 # Order lifecycle with state machine (10→20→30→40→60/70/80)
│   ├── payment/               # Alipay integration (pay, preauth, refund callbacks)
│   ├── coupon/                # Coupon templates, user coupons, points system
│   ├── ticket/                # Customer service ticketing system
│   ├── staff/                 # Merchant staff accounts, RBAC roles/permissions
│   ├── message/               # SMS, Alipay subscription messages, WebSocket gateway
│   ├── review/                # Order reviews and ratings
│   ├── analytics/             # Dashboard, reports, ETL
│   └── (invoice, wallet, renewal, feedback, favorite, violation, report, activity, operation)
└── shared/types/              # TypeScript interfaces (IPayload, StaffPayload, order/vehicle/user types)
```

### Key architectural patterns

- **Response format**: All API responses are wrapped by `ResponseInterceptor` into `{ code: 0, message, data, timestamp }`. Controllers return raw data; the interceptor handles packaging.
- **Authentication**: Dual JWT auth — user tokens (7d expiry, `userType: 'user'`) and staff tokens (2d expiry, `userType: 'staff'`). Redis-based token blacklist for logout. `@Public()` decorator skips auth.
- **Base entity**: All TypeORM entities extend `BaseEntity` which provides `id` (BIGINT auto-increment), `createdAt`/`updatedAt` (DATETIME(3)), `deletedAt` (soft delete), `createdBy`/`updatedBy`.
- **Pagination**: Controllers receive `PageQueryDto` (extends with `.offset` getter and `.sortFields` parser: `-createdAt` → DESC). Responses use `createPaginatedResponse()`.
- **Dual frontend**: The same API serves both user mini-program requests (JwtAuthGuard) and admin web requests (StaffAuthGuard + RolesGuard with RBAC).
- **Redis keys**: Prefixed with `gy:bike:` — used for token blacklist (`auth:blacklist:{userId}`), distributed locks (`lock:create:order:{userId}`), and rate limiting.

### Config module pattern

`AppConfig` is a static class reading from `process.env`. Database/Redis config use NestJS `ConfigModule` with `.env` files. Import paths use TypeScript path aliases: `@common/*`, `@config/*`, `@shared/*`, `@modules/*`.

## Design Documents

- `ME2AI/需求分析文档.md` — Full requirements (V3.0): features, user flows, business rules, KPI targets, MVP scope
- `AI2AI/古月租车小程序_软件框架.md` — Architecture decisions (ADR), tech stack, deployment topology, security design, monitoring
- `AI2AI/古月租车小程序_数据库设计.md` — Database DDL and entity relationships
- `AI2AI/古月租车小程序_后端接口文档.md` — REST API specifications
- `AI2AI/古月租车小程序_前端接口文档.md` — Frontend component/page specs
- `AI2AI/第一阶段编码计划.md` — Phase 1 development plan
