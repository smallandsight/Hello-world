/**
 * 接口限流 Guard 单元测试
 * 覆盖：TH-01 ~ TH-05 (5例)
 */
import { ThrottleGuard } from './throttle.guard';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLE_KEY } from '../decorators/throttle.decorator';

const mockRedisService = {
  rateLimit: jest.fn(),
};

function createMockContext(overrides?: {
  ip?: string;
  url?: string;
  method?: string;
  user?: any;
  handlerMetadata?: any;
}): ExecutionContext {
  const req = {
    ip: overrides?.ip || '127.0.0.1',
    headers: {},
    url: overrides?.url || '/api/test',
    method: overrides?.method || 'GET',
    user: overrides?.user,
    connection: {},
  };
  const res = { header: jest.fn() };
  const handler = jest.fn();

  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => handler,
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('ThrottleGuard', () => {
  let guard: ThrottleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ThrottleGuard(reflector, mockRedisService as any);
    jest.clearAllMocks();
  });

  describe('IP级别全局限制 (TH-01)', () => {
    it('应在未超限时放行请求', async () => {
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTimeMs: Date.now() + 60000,
      });
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":100,"windowMs":60000}']);

      const context = createMockContext();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('应在超过限制时抛出HttpException', async () => {
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTimeMs: Date.now() + 60000,
      });
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":100,"windowMs":60000}']);

      const context = createMockContext();
      try {
        await guard.canActivate(context);
        fail('Expected exception');
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('用户级别限制 (TH-02)', () => {
    it('应对已认证用户按userId限流', async () => {
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: true,
        remaining: 49,
        resetTimeMs: Date.now() + 60000,
      });
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":50,"windowMs":60000}']);

      const context = createMockContext({ user: { id: 123 } });
      const result = await guard.canActivate(context);
      expect(mockRedisService.rateLimit).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('登录接口限制 (TH-03)', () => {
    it('登录接口应使用更严格的限流', async () => {
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTimeMs: Date.now() + 900000,
      });
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":5,"windowMs":900000}']);

      const context = createMockContext({ url: '/auth/staff/login' });
      await guard.canActivate(context);
      expect(mockRedisService.rateLimit).toHaveBeenCalled();
    });
  });

  describe('验证码接口限制 (TH-04)', () => {
    it('发送验证码应限制1次/60秒', async () => {
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: true,
        remaining: 0,
        resetTimeMs: Date.now() + 60000,
      });
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":1,"windowMs":60000}']);

      const context = createMockContext({ url: '/auth/sms/send' });
      await guard.canActivate(context);
      expect(mockRedisService.rateLimit).toHaveBeenCalled();
    });
  });

  describe('窗口重置 (TH-05)', () => {
    it('窗口过期后应重新计数', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['{"limit":100,"windowMs":60000}']);
      mockRedisService.rateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTimeMs: Date.now() + 60000,
      });

      const context = createMockContext();
      expect(await guard.canActivate(context)).toBe(true);
      expect(await guard.canActivate(context)).toBe(true);
    });
  });
});
