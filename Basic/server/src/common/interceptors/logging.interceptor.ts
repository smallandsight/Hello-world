/**
 * 请求日志拦截器
 * 记录每个请求的 URL、方法、耗时等关键信息
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          const logMsg = `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`;

          if (statusCode >= 500) {
            this.logger.error(logMsg);
          } else if (statusCode >= 400) {
            this.logger.warn(logMsg);
          } else if (duration > 1000) {
            this.logger.warn(`${logMsg} [SLOW]`);
          } else {
            this.logger.log(logMsg);
          }
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} ERROR - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
