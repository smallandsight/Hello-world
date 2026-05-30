import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { THROTTLE_KEY, ThrottleOptions } from '../decorators/throttle.decorator';

/**
 * 限流守卫
 * 使用 RedisService.rateLimit 滑动窗口实现接口级别的请求频率限制
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.resolveOptions(context);
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const identifier = this.generateIdentifier(request);

    const windowMs = options.windowMs || 60000;
    const limit = options.limit || 100;

    const key = `${options.keyPrefix || 'throttle'}:${identifier}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    const { allowed, remaining, resetTimeMs } = await this.redisService.rateLimit(
      key,
      windowSeconds,
      limit,
    );

    if (!allowed) {
      throw new HttpException(
        {
          message: `请求过于频繁，请在${Math.ceil(windowMs / 1000)}秒后重试`,
          error: {
            code: 'THROTTLE_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', String(limit));
    response.header('X-RateLimit-Remaining', String(remaining));
    response.header('X-RateLimit-Reset', new Date(resetTimeMs).toUTCString());

    return true;
  }

  private resolveOptions(context: ExecutionContext): ThrottleOptions | null {
    const metadata = this.reflector.get<string[]>(THROTTLE_KEY, context.getHandler());
    if (metadata?.length > 0) {
      try {
        return JSON.parse(metadata[0]);
      } catch {
        return null;
      }
    }
    return null;
  }

  private generateIdentifier(request: any): string {
    if (request.user?.id) return `user:${request.user.id}`;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }
}
