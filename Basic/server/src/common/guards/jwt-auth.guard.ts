/**
 * JWT 认证守卫（用户端）
 * 验证请求头中的 Bearer Token，提取用户信息到 req.user
 * 适用于所有需要用户登录的接口
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppConfig } from '../../config/app.config';
import { IPayload } from '../../shared/types/user.types';
import { PUBLIC_KEY, ROLES_KEY } from '../decorators/permissions.decorator';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查是否标记为公开接口（@Public()）
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 从 Authorization 提取 Token
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('请先登录');
    }

    // 验证 Token 并提取 Payload
    let payload: IPayload;
    try {
      payload = await this.jwtService.verifyAsync<IPayload>(token, {
        secret: AppConfig.jwt.secret,
      });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    // 检查是否在黑名单（登出后的 Token）
    const isBlacklisted = await this.redisService.get(
      `auth:blacklist:${payload.sub}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }

    // 校验 userType 必须为 'user'（用户端）
    if (payload.userType !== 'user') {
      throw new UnauthorizedException('Token 类型不正确');
    }

    // 将用户信息挂载到 request 对象
    request.user = payload;
    return true;
  }

  /**
   * 从请求头中提取 Bearer Token
   */
  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
