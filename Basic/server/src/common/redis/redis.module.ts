/**
 * Redis 模块
 * 封装 ioredis 连接，提供全局 RedisService 单例
 */
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
