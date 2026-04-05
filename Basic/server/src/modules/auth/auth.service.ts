/**
 * 认证服务
 * 提供 JWT Token 的签发、验证、刷新和黑名单管理能力
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { IPayload } from '../../shared/types/user.types';
import { StaffPayload } from '../../shared/types/user.types';
import { AppConfig } from '../../config/app.config';

export interface TokenPair {
  /** Access Token（短期，用于接口认证） */
  accessToken: string;
  /** Refresh Token（长期，用于换取新的 AccessToken） */
  refreshToken: string;
  /** Access Token 过期时间戳(ms) */
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 签发用户端 JWT Token 对（AccessToken + RefreshToken）
   * @param userId 用户 ID
   * @param extra 额外载荷（如手机号等）
   */
  async signUserTokens(
    userId: number,
    extra?: Partial<IPayload>,
  ): Promise<TokenPair> {
    const payload: IPayload = {
      sub: String(userId),
      userType: 'user',
      ...extra,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        expiresIn: AppConfig.jwt.userExpiresIn,
        issuer: AppConfig.jwt.issuer,
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' } as any,
        {
          secret: AppConfig.jwt.secret,
          expiresIn: AppConfig.jwt.refreshExpiresIn,
          issuer: AppConfig.jwt.issuer,
        },
      ),
    ]);

    // 解析过期时间
    const decoded = this.jwtService.decode(accessToken) as any;

    return {
      accessToken,
      refreshToken,
      expiresAt: decoded?.exp * 1000 || Date.now() + 7 * 86400000,
    };
  }

  /**
   * 签发商家端 JWT Token 对
   * @param staffId 商家员工 ID
   * @param roles 角色
   * @param permissions 权限列表
   */
  async signStaffTokens(
    staffId: number,
    roles: string[] = [],
    permissions: string[] = [],
  ): Promise<TokenPair> {
    const payload: StaffPayload = {
      sub: String(staffId),
      userType: 'staff',
      roles,
      permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        expiresIn: AppConfig.jwt.staffExpiresIn,
        issuer: AppConfig.jwt.issuer,
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' } as any,
        {
          secret: AppConfig.jwt.secret,
          expiresIn: AppConfig.jwt.refreshExpiresIn,
          issuer: AppConfig.jwt.issuer,
        },
      ),
    ]);

    const decoded = this.jwtService.decode(accessToken) as any;

    return {
      accessToken,
      refreshToken,
      expiresAt: decoded?.exp * 1000 || Date.now() + 2 * 86400000,
    };
  }

  /**
   * 刷新 Token：使用 RefreshToken 换取新的 Token 对
   * @param refreshToken 原始 RefreshToken
   */
  async refreshUserToken(refreshToken: string): Promise<TokenPair> {
    let payload: IPayload | StaffPayload;
    try {
      payload = await this.jwtService.verifyAsync<IPayload | StaffPayload>(
        refreshToken,
        { secret: AppConfig.jwt.secret },
      );
    } catch {
      throw new UnauthorizedException('RefreshToken 已失效');
    }

    // 确保是 refresh 类型
    if ((payload as any).type !== 'refresh') {
      throw new UnauthorizedException('无效的 RefreshToken');
    }

    // 根据用户类型签发新 Token
    if (payload.userType === 'user') {
      return this.signUserTokens(Number(payload.sub));
    } else if (payload.userType === 'staff') {
      const p = payload as StaffPayload;
      return this.signStaffTokens(Number(p.sub), p.roles || [], p.permissions || []);
    }

    throw new UnauthorizedException('无效的 Token 类型');
  }

  /**
   * 登出：将 Token 加入 Redis 黑名单
   * @param userId 用户ID
   * @param token 要注销的 AccessToken
   * @param ttl 黑名单保留时间（秒），默认与 Token 过期时间一致
   */
  async logout(userId: number, userType: string, token: string): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      return; // Token 已失效，无需处理
    }

    // 计算剩余有效期作为黑名单 TTL
    const remainingTTL = Math.max((payload.exp - Math.floor(Date.now() / 1000)), 60);

    // 写入 Redis 黑名单
    const blacklistKey =
      userType === 'staff'
        ? `auth:blacklist:staff:${userId}`
        : `auth:blacklist:${userId}`;
    await this.redis.set(blacklistKey, token, remainingTTL);
    this.logger.log(`用户 ${userId}(${userType}) 已登出`);
  }
}
