import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

/**
 * 审计日志操作标记
 * 使用方式: @AuditLog('LOGIN') 或 @AuditLog('ORDER_CREATE')
 */
export const AUDIT_LOG_KEY = 'audit_log_action';

export const AuditLog = (action: string) => SetMetadata(AUDIT_LOG_KEY, action);

/**
 * 获取当前请求的操作者信息
 * 用于审计日志记录
 *
 * 返回值: { id, role, ip, userAgent }
 */
export const AuditOperator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // 尝试从JWT中获取用户信息（兼容商家端和用户端）
    const user = request.user || request.staff || {};
    return {
      id: user?.id || user?.sub || null,
      role: user?.role || user?.type || 'anonymous',
      ip: request.ip ||
        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'] || '',
    };
  },
);
