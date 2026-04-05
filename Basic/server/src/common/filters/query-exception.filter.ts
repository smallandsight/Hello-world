/**
 * TypeORM 查询异常过滤器
 * 专门处理数据库查询过程中的异常，避免泄露 SQL 等敏感信息
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ApiResponse } from '../dto/response.dto';
import { ErrorCode, ERROR_MESSAGES } from '../constants/error-code.constants';

@Catch(QueryFailedError, EntityNotFoundError)
export class QueryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof EntityNotFoundError) {
      // 实体未找到
      const body: ApiResponse = {
        code: ErrorCode.NOT_FOUND,
        message: ERROR_MESSAGES[ErrorCode.NOT_FOUND],
        data: null,
        timestamp: new Date().toISOString(),
      };
      return response.status(404).json(body);
    }

    if (exception instanceof QueryFailedError) {
      // 数据库查询错误
      this.logger.error(`数据库查询错误: ${exception.message}`, exception.stack);

      // 根据错误类型返回友好的提示
      let errorCode = ErrorCode.SERVER_INTERNAL_ERROR;
      let message = ERROR_MESSAGES[ErrorCode.SERVER_INTERNAL_ERROR];
      let httpStatus = 500;

      const errMessage = exception.message;

      // 唯一约束冲突
      if (errMessage.includes('Duplicate entry') || errMessage.includes('ER_DUP_ENTRY')) {
        errorCode = ErrorCode.USER_ALREADY_EXISTS;
        message = '数据已存在，请勿重复操作';
        httpStatus = 409;
      }
      // 外键约束
      else if (errMessage.includes('a foreign key constraint') || errMessage.includes('ER_NO_REFERENCED_ROW')) {
        message = '关联数据不存在';
        httpStatus = 400;
      }
      // 字段超长
      else if (errMessage.includes('Data too long') || errMessage.includes('ER_DATA_TOO_LONG')) {
        message = '数据长度超限';
        httpStatus = 400;
      }
      // 连接丢失
      else if (errMessage.includes('ECONNREFUSED') || errMessage.includes('PROTOCOL_CONNECTION_LOST')) {
        errorCode = ErrorCode.SYSTEM_BUSY;
        message = '数据库连接异常，请稍后重试';
        httpStatus = 503;
      }

      const body: ApiResponse = {
        code: errorCode,
        message,
        data: null,
        timestamp: new Date().toISOString(),
      };

      return response.status(httpStatus).json(body);
    }

    // 其他未预期的数据库异常
    this.logger.error(`未知数据库异常: ${exception.message}`, exception.stack);
    const body: ApiResponse = {
      code: ErrorCode.SERVER_INTERNAL_ERROR,
      message: ERROR_MESSAGES[ErrorCode.SERVER_INTERNAL_ERROR],
      data: null,
      timestamp: new Date().toISOString(),
    };
    response.status(500).json(body);
  }
}
