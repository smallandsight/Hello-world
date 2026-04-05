/**
 * 公共模块（Global）
 * 导出所有公共基础设施：过滤器、拦截器、装饰器、DTO、常量等
 * 在 AppModule 中全局注册后，所有模块可直接使用
 */
import { Module, Global } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  exports: [RedisModule],
})
export class CommonModule {}
