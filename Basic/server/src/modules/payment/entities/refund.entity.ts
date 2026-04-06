/**
 * 退款记录实体（refunds 表）
 * 管理所有退款操作（订单退款/押金退还等），含审核流程
 */
import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('refunds')
export class Refund extends BaseEntity {
  // ========== 基本信息 ==========

  /** 退款流水号 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'refund_no',
    comment: '退款流水号',
  })
  refundNo: string;

  /** 关联支付记录 ID */
  @Index()
  @Column({ type: 'bigint', name: 'payment_id', comment: '支付记录ID' })
  paymentId: number;

  /** 关联订单 ID */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', nullable: true, comment: '订单ID' })
  orderId: number | null;

  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  // ========== 金额 ==========

  /** 退款金额（分） */
  @Column({
    type: 'bigint',
    name: 'refund_amount_cents',
    comment: '退款金额(分)',
  })
  refundAmountCents: number;

  /** 原支付金额(分) — 用于时间梯度退款计算 */
  @Column({
    type: 'bigint',
    nullable: true,
    default: null,
    comment: '原支付金额(分)',
  })
  originalAmountCents: number | null;

  /** 退回比例(整数百分比, 如80=80%) — 时间梯度退款 */
  @Column({
    type: 'tinyint',
    nullable: true,
    default: null,
    comment: '退回比例(整数百分比)',
  })
  refundRatio: number | null;

  /**
   * 退款类型：order(订单退款)/deposit(押金退还)/preauth(预授权解冻)
   */
  @Column({
    type: 'enum',
    enum: ['order', 'deposit', 'preauth'],
    name: 'refund_type',
    default: 'order',
    comment: '退款类型：order/deposit/preauth',
  })
  refundType: 'order' | 'deposit' | 'preauth';

  // ========== 审核流程 ==========

  /**
   * 审核状态：0待审核 1已通过 2已驳回 3已取消
   */
  @Column({
    type: 'tinyint',
    name: 'audit_status',
    default: 0,
    comment: '审核状态：0待审核 1通过 2驳回 3取消',
  })
  auditStatus: number;

  /** 审核人 ID */
  @Column({
    type: 'bigint',
    name: 'auditor_id',
    nullable: true,
    comment: '审核人ID',
  })
  auditorId: number | null;

  /** 驳回原因 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'reject_reason',
    nullable: true,
    comment: '驳回原因',
  })
  rejectReason: string | null;

  // ========== 第三方信息 ==========

  /** 退款原因（传给第三方） */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'reason',
    nullable: true,
    comment: '退款原因',
  })
  reason: string | null;

  /** 第三方退款单号 */
  @Index()
  @Column({
    type: 'varchar',
    length: 128,
    name: 'refund_trade_no',
    nullable: true,
    comment: '第三方退款号',
  })
  refundTradeNo: string | null;

  // ========== 状态 ==========

  /**
   * 退款状态：0处理中 1成功 2失败 3已关闭
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0处理中 1成功 2失败 3关闭',
  })
  status: number;

  // ========== 时间 ==========

  /** 申请时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'applied_at',
    nullable: true,
    comment: '申请时间',
  })
  appliedAt: Date | null;

  /** 完成到账时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'completed_at',
    nullable: true,
    comment: '完成时间',
  })
  completedAt: Date | null;
}
