import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 违章押金实体 (T3W10-1)
 *
 * 流程：
 * 1. 用户还车时 → 系统自动冻结一笔违章押金
 * 2. 观察期结束（如30天）→ 无违章则自动解冻退款
 * 3. 如有违章 → 扣除实际费用，剩余退还
 */
@Entity('violation_deposit')
export class ViolationDeposit extends BaseEntity {
  /** 关联订单ID */
  @Column({ type: 'int', name: 'order_id', comment: '关联订单' })
  orderId: number;

  /** 用户ID */
  @Column({ type: 'int', name: 'user_id', comment: '用户' })
  userId: number;

  /** 车辆ID */
  @Column({ type: 'int', name: 'vehicle_id', comment: '车辆', nullable: true })
  vehicleId?: number;

  /** 冻结金额(分) — 通常为订单金额的一定比例或固定金额 */
  @Column({
    type: 'bigint',
    name: 'amount_cents',
    default: 0,
    comment: '冻结金额(分)',
  })
  amountCents: number;

  /**
   * 状态
   * FROZEN=已冻结 | DEDUCTED=已扣除 | REFUNDED=已退还 | PARTIAL_REFUND=部分退还
   */
  @Column({
    type: 'enum',
    enum: ['FROZEN', 'DEDUCTED', 'REFUNDED', 'PARTIAL_REFUND'],
    name: 'status',
    default: 'FROZEN',
    comment: '状态',
  })
  status: string;

  /** 冻关交易流水号（支付宝预授权号）*/
  @Column({
    type: 'varchar',
    length: 64,
    name: 'frozen_transaction_id',
    nullable: true,
    comment: '冻结交易流水号',
  })
  frozenTransactionId?: string;

  /** 实际扣除金额(分) */
  @Column({
    type: 'bigint',
    name: 'deduction_amount',
    nullable: true,
    comment: '实际扣除金额(分)',
  })
  deductionAmount?: number;

  /** 退还金额(分) */
  @Column({
    type: 'bigint',
    name: 'refund_amount',
    nullable: true,
    comment: '退还金额(分)',
  })
  refundAmount?: number;

  /** 违章详情(JSON) — 包含违章时间/地点/类型/罚款/扣分等信息 */
  @Column({
    type: 'json',
    name: 'violation_detail',
    nullable: true,
    comment: '违章详情JSON',
  })
  violationDetail?: any;

  /** 扣除时间 */
  @Column({
    type: 'datetime',
    name: 'deducted_at',
    nullable: true,
    comment: '扣除时间',
  })
  deductedAt?: Date;

  /** 退还时间 */
  @Column({
    type: 'datetime',
    name: 'refunded_at',
    nullable: true,
    comment: '退还时间',
  })
  refundedAt?: Date;

  /** 观察期截止时间 — 到期后自动触发检查 */
  @Column({
    type: 'datetime',
    name: 'observation_end_at',
    nullable: true,
    comment: '观察期截止时间',
  })
  observationEndAt?: Date;

  /** 备注 */
  @Column({
    type: 'text',
    name: 'remark',
    nullable: true,
    comment: '备注',
  })
  remark?: string;
}
