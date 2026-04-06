import type { ApiResponse, PaginatedResponse } from './common'

// ==================== 优惠券相关 ====================

export type CouponDiscountType = 'fixed' | 'percent'   // 满减 / 折扣
export type UserCouponStatus = 'available' | 'used' | 'expired'

/** 优惠券模板 */
export interface Coupon {
  id: number
  name: string
  discountType: CouponDiscountType
  value: number           // 减免金额 或 折扣百分比
  minAmount: number       // 最低消费
  totalQuantity: number
  issuedCount: number
  limitPerUser: number
  validFrom: string
  validTo: string
  enabled: boolean
}

/** 用户已领取的优惠券 */
export interface UserCoupon {
  id: number
  couponId: number
  name: string
  discountType: CouponDiscountType
  value: number
  minAmount: number
  status: UserCouponStatus
  statusText: string
  validFrom: string
  validTo: string
  usedTime?: string | null
  usedOrderId?: number | null
  /** 是否可用于当前订单（查询可用时返回） */
  isAvailable?: boolean
  /** 使用后预估节省金额 */
  estimatedSaving?: number
}

// ==================== 消息相关 ====================

export type MessageType = 'order_status' | 'system' | 'marketing' | 'coupon'
export type MessageChannel = 'push' | 'sms' | 'in_app'

/** 消息列表项 */
export interface MessageItem {
  id: number
  type: MessageType
  title: string
  content: string
  channel: MessageChannel
  bizId?: number | null
  isRead: boolean
  readAt?: Date | null
  sentAt?: Date | null
  createdAt: string
}

/** 消息摘要 */
export interface MessageSummary {
  unreadCount: number
  latestMessages: Array<{
    id: number
    type: MessageType
    title: string
    createdAt: Date
  }>
}

// ==================== 积分相关 ====================

/** 积分信息 */
export interface PointsInfo {
  balance: number
  history: PointsRecord[]
  totalEarned?: number
  totalSpent?: number
}

/** 积分流水记录 */
export interface PointsRecord {
  id: number
  type: 'earn' | 'spend'
  amount: number
  balanceAfter: number
  description: string
  relatedId?: number
  createdAt: string
}
