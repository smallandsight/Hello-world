/**
 * @Permissions() 装饰器
 * 用于标记接口所需的具体权限码，配合 RolesGuard 进行权限校验
 *
 * 使用方式：
 * ```ts
 * @Permissions('order:create', 'order:update')
 * async createOrder() { ... }
 * ```
 */
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 标记当前路由/控制器所需的权限码列表
 */
export const Permissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

/** 角色元数据 key（用于 RBAC） */
export const ROLES_KEY = 'roles';

/**
 * 标记当前路由/控制器所需的角色列表
 * 使用方式：@Roles('admin', 'manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** 公开访问标记（跳过认证） */
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
