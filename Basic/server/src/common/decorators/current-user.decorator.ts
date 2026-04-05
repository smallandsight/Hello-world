/**
 * @CurrentUser() 装饰器
 * 从请求对象中提取当前已认证用户信息
 * 需配合 JwtAuthGuard / StaffAuthGuard 使用，守卫会将用户信息挂载到 req.user
 *
 * 使用方式：
 * ```ts
 * @Get('profile')
 * async getProfile(@CurrentUser() user: IPayload) {
 *   return user;
 * }
 * ```
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果指定了字段名，返回特定字段
    if (data) return user?.[data];

    // 否则返回完整用户对象
    return user;
  },
);
