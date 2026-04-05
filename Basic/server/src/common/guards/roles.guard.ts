/**
 * RBAC 权限守卫
 * 从 Token Payload 中提取用户的 roles 和 permissions，
 * 与接口声明的 @Roles() / @Permissions() 进行匹配
 *
 * 使用方式：
 * ```ts
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Permissions('order:view')
 * async getOrderList() { ... }
 * ```
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 获取用户信息
    const user: any = request.user;
    if (!user) return false;

    // 获取所需的角色和权限
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果未声明任何角色/权限要求，放行
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    // 角色校验：用户角色与要求角色取交集
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles: string[] = user.roles || [];
      const hasRole = requiredRoles.some((role) =>
        userRoles.includes(role),
      );
      if (!hasRole) {
        throw new ForbiddenException(
          `需要角色: ${requiredRoles.join('/')}, 当前角色: ${userRoles.join('/')}`,
        );
      }
    }

    // 权限校验：用户权限与要求权限取交集
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPerms: string[] = user.permissions || [];
      const hasPermission = requiredPermissions.some((perm) =>
        userPerms.includes(perm),
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          `缺少必要权限: ${requiredPermissions.filter(
            (p) => !userPerms.includes(p),
          ).join(', ')}`,
        );
      }
    }

    return true;
  }
}
