/**
 * 认证服务
 * 提供 JWT Token 的签发、验证、刷新和黑名单管理能力，
 * 以及支付宝登录和商家账号登录的完整业务逻辑
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../../common/redis/redis.service';
import { IPayload, StaffPayload } from '../../shared/types/user.types';
import { AppConfig } from '../../config/app.config';
import { User } from '../user/entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { AlipayService, AlipayUserInfo } from '../third-party/alipay/alipay.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
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
   */
  async logout(userId: number, userType: string, token: string): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      return;
    }

    const remainingTTL = Math.max((payload.exp - Math.floor(Date.now() / 1000)), 60);

    const blacklistKey =
      userType === 'staff'
        ? `auth:blacklist:staff:${userId}`
        : `auth:blacklist:${userId}`;
    await this.redis.set(blacklistKey, token, remainingTTL);
    this.logger.log(`用户 ${userId}(${userType}) 已登出`);
  }

  // ==================== 登录业务逻辑 ====================

  /**
   * 支付宝授权登录
   * 流程：authCode → 支付宝用户信息 → 查找/创建本地用户 → 签发JWT
   *
   * @param alipayService 支付宝服务实例（由 Controller 传入，避免循环依赖）
   * @param authCode 前端 my.getAuthCode() 获取的授权码
   * @param inviteCode 邀请码（可选，新用户注册时绑定）
   */
  async loginByAlipay(
    alipayService: AlipayService,
    authCode: string,
    inviteCode?: string,
  ): Promise<LoginResult> {
    let alipayUser: AlipayUserInfo;

    if (alipayService.isEnabled) {
      alipayUser = await alipayService.getUserByAuthCode(authCode);
    } else {
      this.logger.warn('[Auth] 支付宝服务未启用，使用 Mock 数据（仅开发环境）');
      alipayUser = {
        userId: `mock_alipay_${authCode.substring(0, 8)}`,
        avatar: '',
        nickName: '测试用户',
        isCertified: true,
        gender: 'unknown',
      };
    }

    // 查找或创建本地用户
    let user = await this.userRepo.findOne({
      where: { alipayUserId: alipayUser.userId },
    });
    let isNewUser = false;

    if (!user) {
      user = this.userRepo.create({
        alipayUserId: alipayUser.userId,
        nickname: alipayUser.nickName || `用户${alipayUser.userId.substring(0, 8)}`,
        avatarUrl: alipayUser.avatar || null,
        isVerified: alipayUser.isCertified ? 1 : 0,
        phone: null,
        gender: alipayUser.gender === 'm' ? 1 : alipayUser.gender === 'f' ? 2 : 0,
        lastLoginAt: new Date(),
        levelId: 1,
        pointsBalance: 0,
        totalSpendCents: 0,
        totalRides: 0,
        depositStatus: 0,
        depositAmount: 0,
        status: 0,
      });
      await this.userRepo.save(user);
      isNewUser = true;
      this.logger.log(`[Auth] 新用户注册: userId=${user.id} alipayId=${alipayUser.userId}`);

      // 处理邀请码
      if (inviteCode) {
        await this.processInviteCode(user.id, inviteCode);
      }
    } else {
      // 更新登录信息
      await this.userRepo.update(user.id, {
        nickname: alipayUser.nickName || user.nickname,
        avatarUrl: alipayUser.avatar || user.avatarUrl,
        isVerified: alipayUser.isCertified ? 1 : user.isVerified,
        lastLoginAt: new Date(),
      });
      // 重新查询最新数据
      const refreshed = await this.userRepo.findOneBy({ id: user.id });
      if (refreshed) user = refreshed;
    }

    const tokenPair = await this.signUserTokens(user.id, {
      alipayUserId: user.alipayUserId!,
      nickname: user.nickname,
      phone: user.phone || undefined,
    });

    return {
      tokenPair,
      userId: user.id,
      isNewUser,
      user: this.formatLoginUser(user),
    };
  }

  /**
   * 商家账号密码登录
   * 流程：查询账号 → bcrypt验证密码 → 加载角色权限 → 签发JWT
   */
  async loginByStaffAccount(
    account: string,
    password: string,
  ): Promise<StaffLoginResult> {
    const staff = await this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .addSelect('staff.password_hash')
      .where('staff.account = :account', { account })
      .andWhere('staff.deleted_at IS NULL')
      .getOne();

    if (!staff) {
      throw new UnauthorizedException('账号或密码错误');
    }

    if (staff.status === 1) {
      throw new UnauthorizedException('该账号已被禁用，请联系管理员');
    }
    if (staff.status === 2) {
      throw new UnauthorizedException('该账号已被锁定，请联系管理员');
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const roleNames = (staff.roles || [])
      .filter((r) => r.isActive === 1)
      .map((r) => r.roleCode);
    const permCodes = new Set<string>();
    for (const role of staff.roles || []) {
      for (const perm of role.permissions || []) {
        if (perm.isActive === 1) permCodes.add(perm.permissionCode);
      }
    }

    const tokenPair = await this.signStaffTokens(staff.id, roleNames, [...permCodes]);

    // 更新登录统计
    await this.staffRepo.update(staff.id, {
      lastLoginAt: new Date(),
      loginCount: (staff.loginCount || 0) + 1,
    });

    this.logger.log(`[Auth] 商家登录: staffId=${staff.id} account=${account} roles=[${roleNames}]`);

    return {
      tokenPair,
      staff: {
        id: staff.id,
        staffNo: staff.staffNo,
        realName: staff.realName,
        account: this.maskAccount(staff.account),
        avatarUrl: staff.avatarUrl,
        storeId: staff.storeId,
        roles: roleNames,
        permissions: [...permCodes],
        status: staff.status,
      },
    };
  }

  // ==================== 内部格式化方法 ====================

  private formatLoginUser(user: User): any {
    return {
      id: user.id,
      nickname: user.nickname || `用户${user.id}`,
      avatarUrl: user.avatarUrl,
      phone: user.phone ? this.maskPhone(user.phone) : null,
      isVerified: !!user.isVerified,
      memberLevel: user.levelId,
      pointsBalance: user.pointsBalance,
      status: user.status,
    };
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone || '';
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  private maskAccount(account: string): string {
    if (!account) return '';
    const atIdx = account.indexOf('@');
    if (atIdx > 2) {
      return account.substring(0, 2) + '***' + account.substring(atIdx - 1);
    }
    if (account.length >= 7) {
      return account.substring(0, 3) + '****' + account.substring(account.length - 4);
    }
    return '****';
  }

  /** 处理邀请码绑定 */
  private async processInviteCode(newUserId: number, inviteCode: string): Promise<void> {
    try {
      const inviter = await this.userRepo.findOne({
        where: { inviteCode },
      });
      if (inviter && inviter.id !== newUserId) {
        await this.userRepo.update(newUserId, { inviterId: inviter.id });
        this.logger.log(`[Invite] 用户${newUserId} 被 ${inviter.id} 邀请`);
      }
    } catch (err) {
      this.logger.warn(`[Invite] 邀请码处理失败: ${err.message}`);
    }
  }
}

// ==================== 返回类型 ====================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResult {
  tokenPair: TokenPair;
  userId: number;
  isNewUser: boolean;
  user: any;
}

export interface StaffLoginResult {
  tokenPair: TokenPair;
  staff: any;
}
