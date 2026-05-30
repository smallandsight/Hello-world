/**
 * Redis 服务单元测试
 * 覆盖：C-RD-01 ~ C-RD-09 (9例)
 */
import { RedisService } from './redis.service';

const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  pexpire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  hexists: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  eval: jest.fn(),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    service = new RedisService();
    (service as any).getClient = async () => mockRedis;
    jest.clearAllMocks();
  });

  describe('set/get 基本读写 (C-RD-01, C-RD-02)', () => {
    it('set 后 get 应返回正确值', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ a: 1 }));
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test:key', { a: 1 }, 60);
      const result = await service.get('test:key');

      expect(result).toEqual({ a: 1 });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ a: 1 }),
        'EX',
        60,
      );
    });

    it('get 不存在的键应返回 null', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('nonexist');
      expect(result).toBeNull();
    });
  });

  describe('JSON 序列化/反序列化 (C-RD-03)', () => {
    it('应自动序列化和反序列化对象', async () => {
      const testObj = { name: 'test', count: 42, active: true };
      mockRedis.get.mockResolvedValue(JSON.stringify(testObj));

      await service.set('obj:key', testObj, 300);
      const result: any = await service.get('obj:key');

      expect(result).toEqual(testObj);
      expect(typeof result.name).toBe('string');
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });

  describe('分布式锁 acquireLock/releaseLock (C-RD-04, C-RD-05, C-RD-06)', () => {
    it('首次获取锁应成功', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.acquireLock('lock:order:1', 'worker-A', 30);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:order:1', 'worker-A', 'NX', 'EX', 30,
      );
    });

    it('重复获取同一把锁应失败', async () => {
      mockRedis.set
        .mockResolvedValueOnce('OK')
        .mockResolvedValueOnce(null);

      await service.acquireLock('lock:order:1', 'worker-B', 30);
      const result = await service.acquireLock('lock:order:1', 'worker-C', 30);

      expect(result).toBe(false);
    });

    it('持有者释放锁应成功 (C-RD-05)', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await service.releaseLock('lock:order:1', 'owner1');

      expect(result).toBe(true);
    });

    it('非持有者释放锁应失败 (C-RD-06)', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await service.releaseLock('lock:order:1', 'not-owner');

      expect(result).toBe(false);
    });
  });

  describe('滑动窗口限流 rateLimit (C-RD-07, C-RD-08)', () => {
    it('未超限时应允许请求', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1],      // zremrangebyscore
        [null, 4],      // zcard (清理后计数)
        [null, 1],      // zadd
        [null, 1],      // pexpire
      ]);

      const result = await service.rateLimit('user:123', 60, 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('超过限制时应拒绝请求', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 100],    // zcard 返回已达到上限
        [null, 1],
        [null, 1],
      ]);

      const result = await service.rateLimit('user:123', 60, 100);

      expect(result.allowed).toBe(false);
    });
  });

  describe('incr/decr 数值操作 (C-RD-09)', () => {
    it('incr 应递增计数器', async () => {
      mockRedis.incr.mockResolvedValue(3);
      const val = await service.incr('counter');
      expect(val).toBe(3);
      expect(mockRedis.incr).toHaveBeenCalledWith('counter');
    });

    it('decr 应递减计数器', async () => {
      mockRedis.decr.mockResolvedValue(2);
      const val = await service.decr('counter');
      expect(val).toBe(2);
      expect(mockRedis.decr).toHaveBeenCalledWith('counter');
    });
  });
});
