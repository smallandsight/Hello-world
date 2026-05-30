/**
 * Auth 认证服务单元测试
 * 覆盖：JWT签发/刷新/登出/支付宝登录/商家登录
 */
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockStaffRepo = {
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  createQueryBuilder: jest.fn(),
  update: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      mockJwtService as any,
      mockConfigService as any,
      mockRedis as any,
      mockUserRepo as any,
      mockStaffRepo as any,
    );
    jest.clearAllMocks();
  });

  describe('signUserTokens - 签发用户JWT', () => {
    it('应返回 accessToken + refreshToken + expiresAt', async () => {
      mockJwtService.signAsync.mockResolvedValue('fake-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 604800 });

      const result = await service.signUserTokens(1, { phone: '138****5678' });

      expect(result.accessToken).toBe('fake-token');
      expect(result.refreshToken).toBe('fake-token');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('signStaffTokens - 签发商家JWT', () => {
    it('应包含 roles 和 permissions 到 payload', async () => {
      mockJwtService.signAsync.mockResolvedValue('staff-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 172800 });

      const result = await service.signStaffTokens(99, ['admin'], ['order:view']);

      expect(result.accessToken).toBe('staff-token');
      expect(result.refreshToken).toBe('staff-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '99', userType: 'staff', roles: ['admin'], permissions: ['order:view'] }),
        expect.any(Object),
      );
    });
  });

  describe('refreshUserToken - 刷新Token', () => {
    it('应使用 refreshToken 换取新的 Token 对', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: '1', userType: 'user', type: 'refresh',
      });
      mockJwtService.signAsync.mockResolvedValue('new-token');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 604800 });

      const result = await service.refreshUserToken('old-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('old-refresh-token', expect.any(Object));
    });

    it('非 refresh 类型应报错', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: '1', userType: 'user', type: 'access',
      });

      await expect(service.refreshUserToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('过期 Token 应报错', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      await expect(service.refreshUserToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout - 登出', () => {
    it('应将 Token 加入黑名单', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: '1', exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await service.logout(1, 'user', 'some-token');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'auth:blacklist:1',
        'some-token',
        expect.any(Number),
      );
    });
  });

  describe('loginByStaffAccount - 商家账号登录', () => {
    it('正确账号密码应返回 token 和员工信息', async () => {
      const passwordHash = await bcrypt.hash('Gy@2026init', 10);
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 1, account: 'admin', passwordHash, status: 0,
          staffNo: 'GY001', realName: '管理员', avatarUrl: null,
          storeId: 1, loginCount: 5,
          roles: [
            { roleCode: 'SUPER_ADMIN', isActive: 1, permissions: [{ permissionCode: 'dashboard:view', isActive: 1 }] },
          ],
        }),
      };
      mockStaffRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockJwtService.signAsync.mockResolvedValue('staff-jwt');
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 172800 });
      mockStaffRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.loginByStaffAccount('admin', 'Gy@2026init');

      expect(result.tokenPair.accessToken).toBe('staff-jwt');
      expect(result.staff.roles).toContain('SUPER_ADMIN');
      expect(result.staff.permissions).toContain('dashboard:view');
      expect(mockStaffRepo.update).toHaveBeenCalled();
    });

    it('错误密码应报错', async () => {
      const passwordHash = await bcrypt.hash('correct', 10);
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 1, account: 'admin', passwordHash, status: 0, roles: [],
        }),
      };
      mockStaffRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.loginByStaffAccount('admin', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('不存在的账号应报错', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockStaffRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.loginByStaffAccount('ghost', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('禁用账号应报错', async () => {
      const passwordHash = await bcrypt.hash('pass', 10);
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 2, account: 'disabled', passwordHash, status: 1, roles: [],
        }),
      };
      mockStaffRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.loginByStaffAccount('disabled', 'pass'),
      ).rejects.toThrow('已被禁用');
    });

    it('锁定账号应报错', async () => {
      const passwordHash = await bcrypt.hash('pass', 10);
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 3, account: 'locked', passwordHash, status: 2, roles: [],
        }),
      };
      mockStaffRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.loginByStaffAccount('locked', 'pass'),
      ).rejects.toThrow('已被锁定');
    });
  });
});
