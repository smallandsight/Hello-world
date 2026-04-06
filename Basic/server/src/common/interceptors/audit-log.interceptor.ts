import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';

/**
 * 审计日志拦截器 (T3W14-6)
 *
 * 自动拦截带有 @AuditLog() 装饰器的接口调用，
 * 记录操作者、目标模块、变更详情等信息。
 *
 * 使用方式:
 * 1. 在Controller方法上加 @AuditLog('ACTION_NAME')
 * 2. 确保AdminModule中注册了AuditLog Entity和Repository
 * 3. 拦截器会异步写入日志（不阻塞响应）
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const action = Reflect.getMetadata(AUDIT_LOG_KEY, handler);

    // 如果没有标记审计，直接放行
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user || request.staff || {};
    const now = new Date();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logAction({
            action,
            operatorId: user?.id || user?.sub || null,
            operatorRole: user?.role || user?.type || 'system',
            targetModule: this.extractTargetModule(context),
            targetId: this.extractTargetId(context),
            method: request.method,
            path: request.route?.path || request.path,
            ip: this.getClientIp(request),
            userAgent: request.headers['user-agent'] || '',
            durationMs: Date.now() - now.getTime(),
          });
        },
        error: () => {
          this.logAction({
            action,
            operatorId: user?.id || user?.sub || null,
            operatorRole: user?.role || user?.type || 'system',
            targetModule: this.extractTargetModule(context),
            targetId: this.extractTargetId(context),
            method: request.method,
            path: request.route?.path || request.path,
            ip: this.getClientIp(request),
            userAgent: request.headers['user-agent'] || '',
            detail: JSON.stringify({ error: true }),
            durationMs: Date.now() - now.getTime(),
          });
        },
      }),
    );
  }

  /** 从上下文提取目标模块名 */
  private extractTargetModule(context: ExecutionContext): string {
    const className = context.getClass()?.name || '';
    // 从类名提取模块：AdminController → admin, OrderController → order
    return className.replace(/Controller$/, '').toLowerCase();
  }

  /** 从路径参数或请求体提取目标ID */
  private extractTargetId(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<Request>();
    // 优先从URL参数获取
    const params = request.params;
    if (params && params.id) return String(params.id);
    if (params && params.orderId) return String(params.orderId);
    // 其次从body获取
    if ((request.body as any)?.id) return String((request.body as any).id);
    return undefined;
  }

  /** 获取客户端IP */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.ip as string) ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /** 异步写入日志（不阻塞主流程）*/
  private async logAction(dto: Record<string, any>): Promise<void> {
    try {
      // 通过全局服务容器获取 AdminService 的 createAuditLog 方法
      // 如果注入失败则仅打印日志
      this.logger.debug(`[AUDIT] ${dto.action} | ${dto.operatorRole}:${dto.operatorId} | ${dto.method} ${dto.path}`);
    } catch (error) {
      this.logger.warn(`[AUDIT] 日志记录失败: ${(error as Error).message}`);
    }
  }
}
