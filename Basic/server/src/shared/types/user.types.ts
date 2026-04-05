/**
 * 用户/商家 JWT Payload 类型定义
 * Token 中携带的用户身份和权限信息
 */

/** 用户端 JWT Payload */
export interface IPayload {
  /** 用户ID（字符串，兼容 UUID 场景） */
  sub: string;

  /** 用户类型：user（用户端）| staff（商家端） */
  userType: 'user';

  /** 支付宝用户ID（可选） */
  alipayUserId?: string;

  /** 手机号脱敏后（可选） */
  phone?: string;

  /** 用户昵称（可选） */
  nickname?: string;
}

/** 商家端 JWT Payload */
export interface StaffPayload {
  sub: string;
  userType: 'staff';
  /** 角色列表 */
  roles?: string[];
  /** 权限码列表 */
  permissions?: string[];
}

/** 用户信息 VO（脱敏输出） */
export interface UserInfoVO {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  phone: string; // 脱敏后：138****1234
  memberLevel: number;
  pointsBalance: number;
}
