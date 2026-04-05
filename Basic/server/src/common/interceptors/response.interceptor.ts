/**
 * 统一响应格式拦截器
 * 自动将 Controller 返回值包装为 { code: 0, message, data, timestamp } 格式
 * 对应接口文档的统一响应规范
 *
 * 使用方式：在 AppModule 中通过 APP_INTERCEPTOR 全局注册，或在 Controller 级别使用
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse, createSuccessResponse } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果返回值已经是 ApiResponse 格式（如分页），直接透传
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // 自动包装为成功响应
        return createSuccessResponse(data);
      }),
    );
  }
}
