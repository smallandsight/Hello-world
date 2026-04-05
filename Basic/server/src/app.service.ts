import { Injectable, Logger } from '@nestjs/common';

/**
 * 根服务 - 提供基础健康检查能力
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  /**
   * 返回应用基本信息和当前时间戳
   */
  getHealth(): {
    message: string;
    status: string;
    timestamp: string;
  } {
    return {
      message: '🏍️ 古月租车 API 服务运行中',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查（用于 K8s/Docker 探针）
   */
  healthCheck(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
