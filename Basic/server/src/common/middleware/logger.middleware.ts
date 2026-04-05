/**
 * 请求日志中间件
 * 在请求进入时记录基础信息（在 Interceptor 之前执行）
 * 用于补充 LoggingInterceptor 无法获取的原始请求体信息
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Request');

  use(req: Request, _res: Response, next: NextFunction): void {
    const start = Date.now();

    // 响应完成后记录总耗时
    _res.on('finish', () => {
      const duration = Date.now() - start;
      const { method, originalUrl, ip } = req;
      const statusCode = _res.statusCode;

      this.logger.debug(
        `[${method}] ${originalUrl} -> ${statusCode} (${duration}ms) | IP: ${ip}`,
      );
    });

    next();
  }
}
