import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 周聚合分析表
 * 用于存储每周的业务数据汇总
 */
@Entity('analytics_weekly')
@Index(['year', 'week'], { unique: true })
export class AnalyticsWeekly {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 年份 */
  @Column({ type: 'int', comment: '年份' })
  year: number;

  /** 周数 (1-53) */
  @Column({ type: 'int', comment: '周数' })
  week: number;

  /** 开始日期 */
  @Column({ type: 'date', comment: '周开始日期' })
  startDate: string;

  /** 结束日期 */
  @Column({ type: 'date', comment: '周结束日期' })
  endDate: string;

  // ==================== 用户指标 ====================

  @Column({ type: 'int', default: 0, comment: '新增用户数' })
  newUsers: number;

  @Column({ type: 'int', default: 0, comment: '活跃用户数' })
  activeUsers: number;

  @Column({ type: 'int', default: 0, comment: '会员新增数' })
  newMembers: number;

  /** 用户留存率 * 100 */
  @Column({ type: 'int', default: 0, comment: '用户留存率*100' })
  retentionRate: number;

  // ==================== 订单指标 ====================

  @Column({ type: 'int', default: 0, comment: '新增订单数' })
  newOrders: number;

  @Column({ type: 'int', default: 0, comment: '完成订单数' })
  completedOrders: number;

  @Column({ type: 'bigint', default: 0, comment: '订单总金额（分）' })
  orderAmountCents: string;

  @Column({ type: 'bigint', default: 0, comment: '实收金额（分）' })
  paidAmountCents: string;

  /** 订单环比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '订单环比增长率*100' })
  orderGrowthRate: number;

  // ==================== 收入指标 ====================

  @Column({ type: 'bigint', default: 0, comment: '总收入（分）' })
  totalIncomeCents: string;

  @Column({ type: 'bigint', default: 0, comment: '净收入（分）' })
  netIncomeCents: string;

  /** 收入环比增长率 * 100 */
  @Column({ type: 'int', default: 0, comment: '收入环比增长率*100' })
  incomeGrowthRate: number;

  // ==================== 车辆指标 ====================

  @Column({ type: 'int', default: 0, comment: '平均利用率*100' })
  avgUtilizationRate: number;

  @Column({ type: 'int', default: 0, comment: '平均租赁时长*100（小时）' })
  avgRentalHours: number;

  // ==================== 营销指标 ====================

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

  /** 用户满意度 * 100 */
  @Column({ type: 'int', default: 0, comment: '用户满意度*100' })
  satisfactionRate: number;

  // ==================== 每日明细 ====================

  /** 每日数据明细 JSON数组 */
  @Column({ type: 'json', nullable: true, comment: '每日数据明细' })
  dailyDetails: DailyDetail[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}

export interface DailyDetail {
  date: string;
  orders: number;
  amount: number;
  users: number;
}