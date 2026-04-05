/**
 * Redis 服务封装
 * 基于 ioredis 提供统一的缓存操作、分布式锁和限流能力
 *
 * 使用方式：
 * ```ts
 * constructor(private readonly redis: RedisService) {}
 * await this.redis.set('key', 'value', 3600);
 * const val = await this.redis.get<string>('key');
 * ```
 */
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { Cluster } from 'ioredis';
import { getRedisConfig } from '../../config/redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | Cluster | null = null;
  private readonly config = getRedisConfig();

  /** 获取 Redis 客户端实例（懒初始化） */
  async getClient(): Promise<Redis | Cluster> {
    if (!this.client) {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        connectTimeout: this.config.connectTimeout,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis 连接重试超过3次，放弃连接');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      // 连接事件监听
      this.client.on('connect', () => {
        this.logger.log('✅ Redis 连接成功');
      });

      this.client.on('error', (err) => {
        this.logger.error(`❌ Redis 错误: ${err.message}`);
      });
    }

    if (this.client.status === 'end') {
      await this.client.connect();
    }

    return this.client;
  }

  // ==================== 基础 CRUD ====================

  /**
   * 设置键值对（支持过期时间）
   * @param key 键名
   * @param value 值（自动 JSON 序列化对象类型）
   * @param ttlSeconds 过期时间（秒），0 表示永不过期
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 0,
  ): Promise<'OK' | null> {
    const client = await this.getClient();
    const strValue =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds > 0) {
      return client.set(key, strValue, 'EX', ttlSeconds);
    }
    return client.set(key, strValue);
  }

  /**
   * 获取值（自动 JSON 反序列化）
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * 删除键
   */
  async del(key: string | string[]): Promise<number> {
    const client = await this.getClient();
    return client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.exists(key)) === 1;
  }

  /**
   * 获取键的剩余生存时间（秒），返回 -1 表示永不过期，-2 表示不存在
   */
  async ttl(key: string): Promise<number> {
    const client = await this.getClient();
    return client.ttl(key);
  }

  /**
   * 设置键的过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const client = await this.getClient();
    return (await client.expire(key, seconds)) === 1;
  }

  // ==================== 数值操作 ====================

  /** 自增 +1，返回递增后的值 */
  async incr(key: string): Promise<number> {
    const client = await this.getClient();
    return client.incr(key);
  }

  /** 按步长自增 */
  async incrby(key: string, increment: number): Promise<number> {
    const client = await this.getClient();
    return client.incrby(key, increment);
  }

  /** 自减 -1 */
  async decr(key: string): Promise<number> {
    const client = await this.getClient();
    return client.decr(key);
  }

  // ==================== Hash 操作 ====================

  /** 设置 Hash 字段 */
  async hset(
    key: string,
    field: string,
    value: string | number | object,
  ): Promise<number> {
    const client = await this.getClient();
    const strValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    return client.hset(key, field, strValue);
  }

  /** 获取 Hash 字段 */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const client = await this.getClient();
    const value = await client.hget(key, field);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /** 获取 Hash 所有字段和值 */
  async hgetall<T extends Record<string, any>>(
    key: string,
  ): Promise<T | {}> {
    const client = await this.getClient();
    return client.hgetall(key);
  }

  /** 删除 Hash 字段 */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const client = await this.getClient();
    return client.hdel(key, ...fields);
  }

  /** 检查 Hash 字段是否存在 */
  async hexists(key: string, field: string): Promise<boolean> {
    const client = await this.getClient();
    return (await client.hexists(key, field)) === 1;
  }

  // ==================== 批量操作 ====================

  /** 批量获取多个键的值 */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const client = await this.getClient();
    const values = await client.mget(...keys);
    return values.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  /** 批量设置键值对 */
  async mset(
    keyValuePairs: [string, string | number | object][],
  ): Promise<'OK'> {
    const client = await this.getClient();
    const flat = keyValuePairs.flatMap(([k, v]) => [
      k,
      typeof v === 'object' ? JSON.stringify(v) : String(v),
    ]);
    return client.mset(...flat as [string, string, ...string[]]);
  }

  // ==================== 分布式锁 ====================

  /**
   * 获取分布式锁（SET NX EX 原子操作）
   * @param lockKey 锁名称
   * @param value 锁持有者标识（通常用 requestId 或 userId）
   * @param ttlSeconds 锁超时时间（秒），防止死锁
   * @returns 是否成功获取锁
   */
  async acquireLock(
    lockKey: string,
    value: string,
    ttlSeconds: number = 30,
  ): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.set(lockKey, value, 'NX', 'EX', ttlSeconds);
    return result === 'OK';
  }

  /**
   * 释放分布式锁（Lua 脚本确保原子性，只释放自己持有的锁）
   * @param lockKey 锁名称
   * @param value 锁持有者标识（必须与 acquireLock 时一致）
   */
  async releaseLock(lockKey: string, value: string): Promise<boolean> {
    const client = await this.getClient();
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    const result = await client.eval(script, 1, lockKey, value);
    return result === 1;
  }

  // ==================== 限流（滑动窗口） ====================

  /**
   * 滑动窗口限流器
   * 在指定时间窗口内限制请求次数
   *
   * @param key 限流标识（如 user:rate:{userId}）
   * @param windowSeconds 时间窗口（秒）
   * @param maxRequests 窗口内最大请求数
   * @returns { allowed: boolean, remaining: 剩余次数, resetTimeMs: 重置时间戳(ms) }
   */
  async rateLimit(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTimeMs: number;
  }> {
    const client = await this.getClient();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // 使用 ZSET 实现滑动窗口：score 为时间戳，member 为唯一请求ID
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // 清理过期的请求记录
    pipeline.zcard(key); // 当前窗口内的请求数
    pipeline.zadd(key, now, `req:${now}:${Math.random()}`); // 记录当前请求
    pipeline.pexpire(key, windowSeconds * 1000); // 设置整体过期

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline 执行失败');
    }

    const currentCount = results[1][1] as number; // zcard 结果在清理之前
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - (allowed ? 1 : 0));
    const resetTimeMs = now + windowSeconds * 1000;

    return { allowed, remaining, resetTimeMs };
  }

  // ==================== 生命周期 ====================

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis 连接已关闭');
    }
  }
}
