import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import RedisService from '../redis/redis.service';

/** 默认限流配置 */
const DEFAULT_OPTIONS = {
  windowMs: 60000,    // 时间窗口(毫秒)
  limit: 100,          // 窗口内最大请求数
  keyPrefix: 'throttle', // Redis key前缀
};

/** 预定义的限流策略 */
export const THROTTLE_PRESETS = {
  /** 全局IP保护 */
  global: { windowMs: 60_000, limit: 100 },
  /** 已认证用户 */
  user: { windowMs: 60_000, limit: 30 },
  /** 登录接口（防暴力破解）*/
  login: { windowMs: 900_000, limit: 5 },
  /** 发送验证码（防短信轰炸）*/
  sms: { windowMs: 60_000, limit: 1 },
  /** 敏感操作（如支付/退款）*/
  sensitive: { windowMs: 300_000, limit: 5 },
};

/** 自定义装饰器元数据 key */
const METADATA_KEY = '__throttle__';

export interface ThrottleOptions {
  windowMs?: number;
  limit?: number;
  keyPrefix?: string;
}

/**
 * 限流守卫
 *
 * 使用方式：
 * @Throttle({ windowMs: 900000, limit: 5 })
 * @Post('login')
 * async login() {}
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.resolveOptions(context);
    if (!options) return true; // 未配置则放行

    const request = context.switchToHttp().getRequest();
    const identifier = this.generateIdentifier(request);

    const key = `${options.keyPrefix}:${identifier}`;
    const current = await this.redisService.incr(key, 1, options.windowMs / 1000);

    if (current > options.limit) {
      throw new HttpException(HttpStatus.TOO_MANY_REQUESTS({
        message: `请求过于频繁，请在${Math.ceil(options.windowMs / 1000)}秒后重试`,
        error: {
          code: 'THROTTLE_EXCEEDED',
          retryAfter: Math.ceil(options.windowMs / 1000),
        },
      }));
    }

    // 在响应头中添加限流信息
    context.switchToHttp().getResponse().header('X-RateLimit-Limit', String(options.limit));
    context.switchToHttp().getResponse().header('X-RateLimit-Remaining', String(Math.max(0, options.limit - current)));
    context.switchToHttp().getResponse().header('X-RateLimit-Reset', new Date(Date.now() + options.windowMs).toUTCString());

    return true;
  }

  private resolveOptions(context: ExecutionContext): ThrottleOptions | null {
    // 优先从装饰器元数据获取
    const reflector = context.getHandler();
    const metadata = reflector.getMetadata<string[]>(METADATA_KEY);
    if (metadata?.length > 0) {
      try {
        return JSON.parse(metadata[0]);
      } catch {
        return null;
      }
    }
    return null; // 未配置则放行
  }

  private generateIdentifier(request: any): string {
    // 优先使用用户ID，其次使用IP
    if (request.user?.id) return `user:${request.user.id}`;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }
}
