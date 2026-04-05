/**
 * 全局 HTTP 异常过滤器
 * 捕获所有 HttpException 和未知异常，统一包装为 ApiResponse 格式
 * 对应接口文档规范：{ code, message, data, timestamp }
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ErrorCode,
  ERROR_MESSAGES,
} from '../constants/error-code.constants';
import { getHttpStatusCode } from '../constants/status-code.constants';
import { ApiResponse } from '../dto/response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 构建统一响应体
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.SERVER_INTERNAL_ERROR;
    let errorMessage = ERROR_MESSAGES[ErrorCode.SERVER_INTERNAL_ERROR];
    let validationErrors: any[] | undefined;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // class-validator 校验失败（422 Unprocessable Entity）
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse &&
        Array.isArray((exceptionResponse as any).message)
      ) {
        statusCode = HttpStatus.BAD_REQUEST;
        errorCode = ErrorCode.INVALID_PARAMS;
        errorMessage = '参数校验失败';
        validationErrors = (exceptionResponse as any).message;
      } else {
        // 标准 HttpException
        statusCode = exception.getStatus();
        errorCode =
          (exception as any).code || ErrorCode.SERVER_INTERNAL_ERROR;
        errorMessage =
          (typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message) ||
          exception.message ||
          ERROR_MESSAGES[errorCode] ||
          '请求处理失败';
      }
    } else if (exception instanceof Error) {
      // 未捕获的未知错误
      this.logger.error(
        `未捕获异常: ${exception.message}`,
        exception.stack,
      );
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.SERVER_INTERNAL_ERROR;
      errorMessage = ERROR_MESSAGES[ErrorCode.SERVER_INTERNAL_ERROR];
    }

    // 如果 errorCode 在映射表中，使用映射的 HTTP 状态码
    const mappedStatus = getHttpStatusCode(errorCode);
    if (mappedStatus && exception instanceof Error) {
      statusCode = mappedStatus;
    }

    const body: ApiResponse = {
      code: errorCode,
      message: errorMessage,
      data: validationErrors ? { errors: validationErrors } : null,
      timestamp: new Date().toISOString(),
    };

    // 记录非客户端错误的日志
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> [${errorCode}] ${errorMessage}`,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} -> [${errorCode}] ${errorMessage}`,
      );
    }

    response.status(statusCode).json(body);
  }
}
