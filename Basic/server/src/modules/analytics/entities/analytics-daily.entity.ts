import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 日聚合分析表
 * 用于存储每日的业务数据汇总，支持数据分析Dashboard
 */
@Entity('analytics_daily')
@Index(['date'], { unique: true })
export class AnalyticsDaily {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 统计日期 YYYY-MM-DD */
  @Column({ type: 'date', comment: '统计日期' })
  date: string;

  // ==================== 用户指标 ====================

  /** 新增用户数 */
  @Column({ type: 'int', default: 0, comment: '新增用户数' })
  newUsers: number;

  /** 活跃用户数 */
  @Column({ type: 'int', default: 0, comment: '活跃用户数' })
  activeUsers: number;

  /** 下单用户数 */
  @Column({ type: 'int', default: 0, comment: '下单用户数' })
  orderUsers: number;

  /** 会员新增数 */
  @Column({ type: 'int', default: 0, comment: '会员新增数' })
  newMembers: number;

  // ==================== 订单指标 ====================

  /** 新增订单数 */
  @Column({ type: 'int', default: 0, comment: '新增订单数' })
  newOrders: number;

  /** 完成订单数 */
  @Column({ type: 'int', default: 0, comment: '完成订单数' })
  completedOrders: number;

  /** 取消订单数 */
  @Column({ type: 'int', default: 0, comment: '取消订单数' })
  cancelledOrders: number;

  /** 订单总金额（分） */
  @Column({ type: 'bigint', default: 0, comment: '订单总金额（分）' })
  orderAmountCents: string;

  /** 订单实收金额（分） */
  @Column({ type: 'bigint', default: 0, comment: '订单实收金额（分）' })
  paidAmountCents: string;

  /** 优惠券抵扣金额（分） */
  @Column({ type: 'bigint', default: 0, comment: '优惠券抵扣金额（分）' })
  couponDiscountCents: string;

  /** 平均客单价（分） */
  @Column({ type: 'bigint', default: 0, comment: '平均客单价（分）' })
  avgOrderAmountCents: string;

  // ==================== 车辆指标 ====================

  /** 总车辆数 */
  @Column({ type: 'int', default: 0, comment: '总车辆数' })
  totalVehicles: number;

  /** 可用车辆数 */
  @Column({ type: 'int', default: 0, comment: '可用车辆数' })
  availableVehicles: number;

  /** 出租车辆数 */
  @Column({ type: 'int', default: 0, comment: '出租车辆数' })
  rentedVehicles: number;

  /** 车辆利用率 (%) * 100 存储 */
  @Column({ type: 'int', default: 0, comment: '车辆利用率*100' })
  utilizationRate: number;

  /** 平均租赁时长（小时）* 100 存储 */
  @Column({ type: 'int', default: 0, comment: '平均租赁时长*100（小时）' })
  avgRentalHours: number;

  // ==================== 收入指标 ====================

  /** 租金收入（分） */
  @Column({ type: 'bigint', default: 0, comment: '租金收入（分）' })
  rentalIncomeCents: string;

  /** 保险收入（分） */
  @Column({ type: 'bigint', default: 0, comment: '保险收入（分）' })
  insuranceIncomeCents: string;

  /** 服务费收入（分） */
  @Column({ type: 'bigint', default: 0, comment: '服务费收入（分）' })
  serviceFeeCents: string;

  /** 其他收入（分） */
  @Column({ type: 'bigint', default: 0, comment: '其他收入（分）' })
  otherIncomeCents: string;

  /** 退款金额（分） */
  @Column({ type: 'bigint', default: 0, comment: '退款金额（分）' })
  refundAmountCents: string;

  /** 净收入（分）= 总收入 - 退款 */
  @Column({ type: 'bigint', default: 0, comment: '净收入（分）' })
  netIncomeCents: string;

  // ==================== 支付指标 ====================

  /** 支付成功笔数 */
  @Column({ type: 'int', default: 0, comment: '支付成功笔数' })
  successPayments: number;

  /** 支付失败笔数 */
  @Column({ type: 'int', default: 0, comment: '支付失败笔数' })
  failedPayments: number;

  /** 支付成功率 * 100 存储 */
  @Column({ type: 'int', default: 0, comment: '支付成功率*100' })
  paymentSuccessRate: number;

  // ==================== 营销指标 ====================

  /** 优惠券使用数 */
  @Column({ type: 'int', default: 0, comment: '优惠券使用数' })
  couponUsed: number;

  /** 优惠券发放数 */
  @Column({ type: 'int', default: 0, comment: '优惠券发放数' })
  couponIssued: number;

  /** 积分发放 */
  @Column({ type: 'bigint', default: 0, comment: '积分发放' })
  pointsIssued: string;

  /** 积分消耗 */
  @Column({ type: 'bigint', default: 0, comment: '积分消耗' */
  pointsConsumed: string;

  // ==================== 客服指标 ====================

  /** 新增工单数 */
  @Column({ type: 'int', default: 0, comment: '新增工单数' })
  newTickets: number;

  /** 解决工单数 */
  @Column({ type: 'int', default: 0, comment: '解决工单数' })
  resolvedTickets: number;

  /** 平均响应时间（秒） */
  @Column({ type: 'int', default: 0, comment: '平均响应时间（秒）' })
  avgResponseTime: number;

  // ==================== 门店维度（JSON）====================

  /** 各门店数据汇总 JSON格式 */
  @Column({ type: 'json', nullable: true, comment: '各门店数据汇总' })
  storeMetrics: Record<string, StoreDailyMetric>;

  // ==================== 车型维度（JSON）====================

  /** 各车型数据汇总 JSON格式 */
  @Column({ type: 'json', nullable: true, comment: '各车型数据汇总' })
  modelMetrics: Record<string, ModelDailyMetric>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}

/** 门店日指标 */
export interface StoreDailyMetric {
  storeId: string;
  storeName: string;
  orders: number;
  amount: number;
  newUsers: number;
}

/** 车型日指标 */
export interface ModelDailyMetric {
  modelId: string;
  modelName: string;
  orders: number;
  amount: number;
  utilizationRate: number;
}