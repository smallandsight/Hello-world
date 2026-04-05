/**
 * Redis 配置（ioredis）
 * 提供连接参数和 RedisModule 异步注册
 */
import { Module, Global } from '@nestjs/common';
import ConfigModule from './config.module';

export interface RedisConfigOptions {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  connectTimeout: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

/**
 * 从 ConfigService 获取 Redis 连接配置
 */
export function getRedisConfig(): RedisConfigOptions {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_PREFIX || 'gy:bike:',
    connectTimeout: parseInt(
      process.env.REDIS_CONNECT_TIMEOUT || '10000',
      10,
    ),
    maxRetriesPerRequest: parseInt(
      process.env.REDIS_MAX_RETRIES || '3',
      10,
    ),
    lazyConnect: true,
  };
}
