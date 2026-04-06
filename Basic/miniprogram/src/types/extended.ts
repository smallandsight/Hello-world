// ==================== 钱包相关类型 ====================

/** 钱包信息 */
export interface WalletInfo {
  balance: number           // 余额(分)
  frozenAmount: number      // 冻结金额(分)
  /** 格式化后的余额(元) */
  balanceFormatted?: string
}

/** 钱包交易流水类型枚举 */
export enum TransactionType {
  RECHARGE = 'RECHARGE',     // 充值
  PAY = 'PAY',               // 支付
  REFUND = 'REFUND',         // 退款
  DEDUCTION = 'DEDUCTION',   // 扣除(违章等)
  REBATE = 'REBATE',         // 返还
}

/** 钱包交易流水记录 */
export interface WalletTransaction {
  id: number
  type: TransactionType
  amount: number             // 正入账/负出账(分)
  balanceAfter: number       // 交易后余额(分)
  relatedOrderId?: number    // 关联订单ID
  remark?: string            // 备注
  createdAt: string          // 交易时间
}

// ==================== 发票相关类型 ====================

/** 抬头类型 */
export type InvoiceTitleType = 'COMPANY' | 'PERSONAL'

/** 发票抬头 */
export interface InvoiceTitle {
  id: number
  type: InvoiceTitleType
  name: string               // 抬头名称/公司名
  taxNo?: string             // 税号（企业必填）
  phone?: string
  email?: string
  bankName?: string
  bankAccount?: string
  address?: string
  isDefault: boolean
  createdAt: string
}

/** 发票状态 */
export enum InvoiceStatus {
  PENDING = 'PENDING',       // 待开票
  ISSUED = 'ISSUED',        // 已开具
  SENT = 'SENT',            // 已邮寄
  DELIVERED = 'DELIVERED',  // 已交付
}

/** 发票申请记录 */
export interface Invoice {
  id: number
  orderId: number
  orderNo?: string
  titleId: number
  titleName: string
  amountCents: number        // 发票金额(分)
  status: InvoiceStatus
  invoiceNo?: string         // 发票号码
  expressNo?: string         // 物流单号
  issuedAt?: string
  createdAt: string
}

// ==================== 续租相关类型 ====================

/** 续租状态 */
export enum RenewalStatus {
  PENDING = 'PENDING',       // 待审批
  APPROVED = 'APPROVED',     // 已同意
  REJECTED = 'REJECTED',     // 已拒绝
  PAID = 'PAID',             // 已支付
  CANCELLED = 'CANCELLED',   // 已取消
}

/** 续租记录 */
export interface Renewal {
  id: number
  orderId: number
  originalReturnTime: string // 原归还时间
  newReturnTime: string      // 新归还时间
  extraDays: number          // 续租天数
  amountCents: number        // 续租费用(分)
  status: RenewalStatus
  reason?: string
  rejectReason?: string
  approvedBy?: string
  createdAt: string
}

// ==================== 违章押金相关类型 ====================

/** 违章押金状态 */
export enum ViolationDepositStatus {
  FROZEN = 'FROZEN',         // 已冻结
  DEDUCTED = 'DEDUCTED',     // 已扣除
  REFUNDED = 'REFUNDED',     // 已退还
  PARTIAL_REFUND = 'PARTIAL_REFUND', // 部分退还
}

/** 违章押金记录 */
export interface ViolationDeposit {
  id: number
  orderId: number
  orderNo?: string
  amountCents: number        // 押金金额(分)
  status: ViolationDepositStatus
  deductionAmountCents?: number  // 扣除金额
  refundAmountCents?: number     // 退还金额
  violationDetail?: string       // 违章详情
  observationEndAt: string       // 观察期截止日
  deductedAt?: string
  refundedAt?: string
  remark?: string
  createdAt: string
}

// ==================== 评价相关类型 ====================

/** 评价状态 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

/** 评价数据 */
export interface Review {
  id: number
  orderId: number
  vehicleId: number
  userId: number
  userName?: string
  userAvatar?: string
  rating: number              // 1-5星
  content?: string
  images?: string[]           // 图片URL数组
  tags?: string[]
  replyContent?: string
  repliedAt?: string
  status: ReviewStatus
  createdAt: string
}

/** 评分汇总 */
export interface ReviewSummary {
  averageRating: number       // 平均分
  totalCount: number          // 总评价数
  /** 各星级占比 {5: 60, 4: 25, ...} */
  distribution: Record<number, number>
}

// ==================== 反馈相关类型 ====================

/** 反馈分类 */
export enum FeedbackCategory {
  BUG = 'bug',
  SUGGESTION = 'suggestion',
  COMPLAINT = 'complaint',
  OTHER = 'other',
}

/** 反馈状态 */
export enum FeedbackStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/** 反馈记录 */
export interface Feedback {
  id: number
  category: FeedbackCategory
  content: string
  images?: string[]
  contact?: string
  status: FeedbackStatus
  replyContent?: string
  repliedAt?: string
  createdAt: string
}

// ==================== 工单相关类型 ====================

/** 工单分类 */
export enum TicketCategory {
  ORDER_ISSUE = 'order_issue',
  PAYMENT_DISPUTE = 'payment',
  VEHICLE_PROBLEM = 'vehicle',
  REFUND_REQUEST = 'refund',
  ACCOUNT_ISSUE = 'account',
  SUGGESTION = 'suggestion',
  ACCIDENT = 'accident',
  OTHER = 'other',
}

/** 工单状态 */
export enum TicketStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  WAITING_USER = 'WAITING_USER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
  REOPENED = 'REOPENED',
}

/** 工单优先级 */
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** 工单 */
export interface Ticket {
  id: number
  category: TicketCategory
  title: string
  content: string
  images?: string[]
  status: TicketStatus
  priority: TicketPriority
  assigneeId?: number
  assigneeName?: string
  slaResponseAt?: string
  slaResolveAt?: string
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
  /** 回复数 */
  replyCount?: number
}

/** 工单回复 */
export interface TicketReply {
  id: number
  ticketId: number
  senderType: 'USER' | 'STAFF' | 'SYSTEM'
  senderName?: string
  content: string
  images?: string[]
  createdAt: string
}

// ==================== 积分相关类型 ====================

/** 积分信息 */
export interface PointsInfo {
  balance: number             // 当前积分余额
  todaySigned: boolean        // 今日是否已签到
  continuousDays?: number     // 连续签到天数
}

/** 积分记录 */
export interface PointsRecord {
  id: number
  type: string                // 来源类型: SIGN_IN/ORDER_COMPLETE/REVIEW/INVITE
  points: number              // 变动积分(正=获得, 负=消耗)
  balanceAfter: number        // 变动后余额
  relatedOrder?: number
  description?: string
  createdAt: string
}

// ==================== 会员等级相关类型 ====================

/** 会员等级信息 */
export interface MemberLevelInfo {
  level: number               // 1-4
  levelName: string           // 普通会员/银卡/金卡/钻石
  totalSpentCents: number     // 累计消费(分)
  nextLevelSpentCents?: number // 升级到下一级需要的累计消费
  discountRate: number        // 折扣率
  pointsRate: number          // 积分倍率
  /** 升级进度 0-100 */
  progressPercent?: number
}
