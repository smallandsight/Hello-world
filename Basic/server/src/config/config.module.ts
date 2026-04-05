/**
 * 配置模块 - 统一管理数据库和 Redis 配置导出
 * 注意：ConfigModule.forRoot() 已在 AppModule 中全局注册（isGlobal: true）
 * 此文件用于集中导入/导出 TypeORM 和 Redis 的异步配置
 */
import { Module } from '@nestjs/common';
import { DatabaseConfig } from './database.config';

@Module({
  imports: [DatabaseConfig],
  exports: [DatabaseConfig],
})
export class AppConfigModule {}
