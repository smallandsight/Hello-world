import type { PaginatedResponse } from './common'
import type { Vehicle, Store } from './vehicle'

// ==================== 订单状态枚举 ====================

export enum OrderStatus {
  PENDING_PAYMENT = 10,    // 待支付
  PAID = 20,               // 已支付(待取车)
  IN_PROGRESS = 30,        // 使用中(已取车)
  PENDING_SETTLEMENT = 40,  // 待结算
  COMPLETED = 60,          // 已完成
  CANCELLED = 70,          // 已取消
  EXCEPTION = 80,          // 异常
}

/** 订单状态中文映射 */
export const ORDER_STATUS_TEXT: Record<number, string> = {
  [OrderStatus.PENDING_PAYMENT]: '待支付',
  [OrderStatus.PAID]: '待取车',
  [OrderStatus.IN_PROGRESS]: '使用中',
  [OrderStatus.PENDING_SETTLEMENT]: '待结算',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.EXCEPTION]: '异常',
}

/** 状态对应的 CSS 类名 */
export const ORDER_STATUS_CLASS: Record<number, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'status-warning',
  [OrderStatus.PAID]: 'status-primary',
  [OrderStatus.IN_PROGRESS]: 'status-success',
  [OrderStatus.PENDING_SETTLEMENT]: 'status-info',
  [OrderStatus.COMPLETED]: 'status-default',
  [OrderStatus.CANCELLED]: 'status-muted',
  [OrderStatus.EXCEPTION]: 'status-danger',
}

// ==================== 订单类型 ====================

/** 订单项（多车辆时每辆车一个 item） */
export interface OrderItem {
  id: number
  orderId: number
  vehicleId: number
  vehicleName: string
  vehicleImage: string
  dailyRate: number
  days: number
  rentalFee: number
  insuranceFee: number
  serviceFee: number
  discountAmount: number
  subtotal: number
}

/** 价格预览/费用明细 */
export interface FeeDetail {
  /** 租金明细 */
  rentalDays: number
  rentalFee: number         // 租金（分）
  /** 服务费 */
  serviceFee: number         // （分）
  /** 保险费 */
  insuranceFee: number       // （分）
  /** 优惠券抵扣 */
  couponDiscount: number     // （分）
  /** 超时费 */
  overtimeFee?: number       // （分）
  /** 合计金额 */
  totalFee: number           // （分）
  /** 押金 */
  depositAmount: number      // （分）
  /** 违章押金 */
  violationDeposit: number   // （分）
}

/** 订单完整信息 */
export interface Order {
  id: number
  orderNo: string            // GY20260406xxxxxxx
  userId: number
  /** 车辆信息 */
  vehicleId: number
  vehicleName: string
  vehicleImage: string
  vehicleNo: string
  /** 门店信息 */
  storeId: number
  storeName: string
  storeAddress: string
  /** 时间 */
  startTime: string
  endTime: string
  actualStartTime?: string
  actualEndTime?: string
  rentDays: number
  /** 费用 */
  dailyRate: number
  feeDetail: FeeDetail
  totalAmount: number        // 实付金额（分）
  paidAmount: number
  refundAmount?: number
  /** 状态 */
  status: OrderStatus
  statusText: string
  /** 操作权限 */
  canCancel: boolean
  canPickup: boolean
  canReturn: boolean
  canPay: boolean
  canRenew: boolean
  canReview: boolean
  /** 取车码 / 还车码 */
  pickupCode?: string
  returnCode?: string
  /** 时间线日志 */
  logs?: OrderLogItem[]
  /** 评价 */
  reviewContent?: string
  reviewScore?: number
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  paidAt?: string
  completedAt?: string
}

/** 订单日志条目 */
export interface OrderLogItem {
  id: number
  action: string
  operator: string
  detail: Record<string, any>
  createdAt: string
}

/** 订单列表项（精简版） */
export interface OrderListItem {
  id: number
  orderNo: string
  vehicleName: string
  vehicleImage: string
  storeName: string
  startTime: string
  endTime: string
  totalAmount: number
  status: OrderStatus
  statusText: string
  canCancel: boolean
  canPickup: boolean
  canReturn: boolean
  canPay: boolean
  createdAt: string
}

/** 创建订单参数 */
export interface CreateOrderParams {
  storeId: number
  items: Array<{
    vehicleId: number
    startTime: string    // ISO 格式
    endTime: string
  }>
  pickupStoreId?: number
  returnStoreId?: number
  insuranceType?: 'basic' | 'premium' | 'none'  // 保险类型
  userCouponId?: number
  remark?: string
}
