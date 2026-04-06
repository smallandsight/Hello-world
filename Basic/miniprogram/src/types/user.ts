import type { PaginatedResponse } from './common'

// ==================== 用户相关 ====================

/** 用户信息（脱敏输出） */
export interface UserInfo {
  userId: number
  nickname: string
  avatarUrl: string
  phone: string        // 已脱敏 138****1234
  gender: number       // 0未知 1男 2女
  birthday: string | null
  isVerified: boolean
  creditScore: number
  memberLevelId: number
  memberLevelName: string
  status: number
  createdAt: string
  updatedAt: string
}

/** 驾驶证信息 */
export interface LicenseInfo {
  id: number
  name: string
  licenseNo: string     // 脱敏显示
  licenseClass: string
  permitType: string
  issueDate: string
  expireDate: string
  status: number        // 0待审核 1已通过 2已拒绝
  rejectReason?: string
}

/** 会员等级信息 */
export interface MemberInfo {
  levelName: string
  levelCode: string
  points: number
  discount: number      // 折扣率 如 95 表示 95折
  benefits: string[]    // 权益列表
  nextLevelName?: string
  nextLevelPoints?: number
  upgradeProgress: number // 0-100 升级进度百分比
}

/** 钱包信息 */
export interface WalletInfo {
  balance: number       // 余额（分）
  balanceDisplay: string // 格式化后 ¥12.50
  recentTransactions: TransactionRecord[]
}

/** 交易记录 */
export interface TransactionRecord {
  id: number
  type: 'recharge' | 'payment' | 'refund' | 'reward' | 'deduct'
  amount: number       // 分
  description: string
  createdAt: string
}

/** 登录返回 */
export interface LoginResult {
  token: string
  refreshToken?: string
  userInfo: UserInfo
  isNewUser: boolean
}

/** JWT Payload */
export interface JWTPayload {
  sub: number          // 用户ID
  userType: 'user' | 'staff'
  nickname?: string
  phone?: string
  iat?: number
  exp?: number
}
