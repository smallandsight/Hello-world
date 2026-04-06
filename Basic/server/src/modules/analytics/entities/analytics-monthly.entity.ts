import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 月聚合分析表
 * 用于存储每月的业务数据汇总，支持同比环比分析
 */
@Entity('analytics_monthly')
@Index(['year', 'month'], { unique: true })
export class AnalyticsMonthly {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 年份 */
  @Column({ type: 'int', comment: '年份' })
  year: number;

  /** 月份 (1-12) */
  @Column({ type: 'int', comment: '月份' })
  month: number;

  /** 开始日期 */
  @Column({ type: 'date', comment: '月开始日期' })
  startDate: string;

  /** 结束日期 */
  @Column({ type: 'date', comment: '月结束日期' })
  endDate: string;

  // ==================== 用户指标 ====================

  @Column({ type: 'int', default: 0, comment: '新增用户数' })
  newUsers: number;

  @Column({ type: 'int', default: 0, comment: '活跃用户数' })
  activeUsers: number;

  @Column({ type: 'int', default: 0, comment: '会员新增数' })
  newMembers: number;

  /** 用户同比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '用户同比增长率*100' })
  userYoYGrowth: number;

  /** 用户环比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '用户环比增长率*100' })
  userMoMGrowth: number;

  // ==================== 订单指标 ====================

  @Column({ type: 'int', default: 0, comment: '新增订单数' })
  newOrders: number;

  @Column({ type: 'int', default: 0, comment: '完成订单数' })
  completedOrders: number;

  @Column({ type: 'int', default: 0, comment: '取消订单数' })
  cancelledOrders: number;

  @Column({ type: 'bigint', default: 0, comment: '订单总金额（分）' })
  orderAmountCents: string;

  @Column({ type: 'bigint', default: 0, comment: '实收金额（分）' })
  paidAmountCents: string;

  @Column({ type: 'bigint', default: 0, comment: '平均客单价（分）' })
  avgOrderAmountCents: string;

  /** 订单同比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '订单同比增长率*100' })
  orderYoYGrowth: number;

  /** 订单环比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '订单环比增长率*100' })
  orderMoMGrowth: number;

  // ==================== 收入指标 ====================

  @Column({ type: 'bigint', default: 0, comment: '租金收入（分）' })
  rentalIncomeCents: string;

  @Column({ type: 'bigint', default: 0, comment: '保险收入（分）' })
  insuranceIncomeCents: string;

  @Column({ type: 'bigint', default: 0, comment: '服务费收入（分）' })
  serviceFeeCents: string;

  @Column({ type: 'bigint', default: 0, comment: '退款金额（分）' })
  refundAmountCents: string;

  @Column({ type: 'bigint', default: 0, comment: '净收入（分）' })
  netIncomeCents: string;

  /** 收入同比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '收入同比增长率*100' })
  incomeYoYGrowth: number;

  /** 收入环比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '收入环比增长率*100' })
  incomeMoMGrowth: number;

  // ==================== 车辆指标 ====================

  @Column({ type: 'int', default: 0, comment: '总车辆数' })
  totalVehicles: number;

  @Column({ type: 'int', default: 0, comment: '平均利用率*100' })
  avgUtilizationRate: number;

  @Column({ type: 'int', default: 0, comment: '最高利用率*100' })
  maxUtilizationRate: number;

  @Column({ type: 'int', default: 0, comment: '平均租赁时长*100（小时）' })
  avgRentalHours: number;

  // ==================== 支付指标 ====================

  @Column({ type: 'int', default: 0, comment: '支付成功笔数' })
  successPayments: number;

  @Column({ type: 'int', default: 0, comment: '支付失败笔数' })
  failedPayments: number;

  @Column({ type: 'int', default: 0, comment: '支付成功率*100' })
  paymentSuccessRate: number;

  // ==================== 营销指标 ====================

  @Column({ type: 'int', default: 0, comment: '优惠券发放数' })
  couponIssued: number;

  @Column({ type: 'int', default: 0, comment: '优惠券使用数' })
  couponUsed: number;

  @Column({ type: 'bigint', default: 0, comment: '优惠券抵扣金额（分）' })
  couponDiscountCents: string;

  @Column({ type: 'bigint', default: 0, comment: '积分发放' })
  pointsIssued: string;

  @Column({ type: 'bigint', default: 0, comment: '积分消耗' })
  pointsConsumed: string;

  // ==================== 客服指标 ====================

  @Column({ type: 'int', default: 0, comment: '新增工单数' })
  newTickets: number;

  @Column({ type: 'int', default: 0, comment: '解决工单数' })
  resolvedTickets: number;

  @Column({ type: 'int', default: 0, comment: '平均响应时间（秒）' })
  avgResponseTime: number;

  @Column({ type: 'int', default: 0, comment: '用户满意度*100' })
  satisfactionRate: number;

  // ==================== 用户分群 ====================

  /** 高价值用户数 */
  @Column({ type: 'int', default: 0, comment: '高价值用户数' })
  highValueUsers: number;

  /** 活跃用户数 */
  @Column({ type: 'int', default: 0, comment: '活跃用户数' })
  activeUsersSegment: number;

  /** 沉睡用户数 */
  @Column({ type: 'int', default: 0, comment: '沉睡用户数' })
  dormantUsers: number;

  /** 流失用户数 */
  @Column({ type: 'int', default: 0, comment: '流失用户数' })
  churnedUsers: number;

  // ==================== 维度数据 ====================

  /** 门店排名 Top10 */
  @Column({ type: 'json', nullable: true, comment: '门店排名Top10' })
  storeRanking: StoreRankingItem[];

  /** 车型排名 Top10 */
  @Column({ type: 'json', nullable: true, comment: '车型排名Top10' })
  modelRanking: ModelRankingItem[];

  /** 每周明细 */
  @Column({ type: 'json', nullable: true, comment: '每周数据明细' })
  weeklyDetails: WeeklyDetail[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}

export interface StoreRankingItem {
  storeId: string;
  storeName: string;
  orders: number;
  amount: number;
  rank: number;
}

export interface ModelRankingItem {
  modelId: string;
  modelName: string;
  orders: number;
  amount: number;
  utilizationRate: number;
  rank: number;
}

export interface WeeklyDetail {
  week: number;
  orders: number;
  amount: number;
  users: number;
}