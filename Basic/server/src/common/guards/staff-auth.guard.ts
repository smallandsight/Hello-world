/**
 * 商家端 JWT 认证守卫
 * 与 JwtAuthGuard 逻辑类似，但验证 userType === 'staff'
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
import { StaffPayload } from '../../shared/types/user.types';
import { PUBLIC_KEY } from '../decorators/permissions.decorator';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 公开接口放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 提取 Token（使用 staff-token 方式区分）
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('请先登录商家账号');
    }

    let payload: StaffPayload;
    try {
      payload = await this.jwtService.verifyAsync<StaffPayload>(token, {
        secret: AppConfig.jwt.secret,
      });
    } catch {
      throw new UnauthorizedException('商家登录已过期，请重新登录');
    }

    // 黑名单检查
    const isBlacklisted = await this.redisService.get(
      `auth:blacklist:staff:${payload.sub}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('商家登录已失效，请重新登录');
    }

    // 必须是商家端 Token
    if (payload.userType !== 'staff') {
      throw new UnauthorizedException('非商家端 Token，无法访问');
    }

    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
