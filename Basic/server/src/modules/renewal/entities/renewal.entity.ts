import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 续租申请 (T3W10-5)
 *
 * 用户在订单未完成前申请延长租车时间
 */
@Entity('order_renewal')
export class Renewal extends BaseEntity {
  /** 关联订单ID */
  @Column({ type: 'int', name: 'order_id', comment: '关联订单' })
  orderId: number;

  /** 原计划还车时间 */
  @Column({ type: 'datetime', name: 'original_return_time', comment: '原计划还车时间' })
  originalReturnTime: Date;

  /** 申请延长天数 */
  @Column({ type: 'int', name: 'requested_days', comment: '申请延长(天)' })
  requestedDays: number;

  /**
   * 额外费用(分) — 按当前定价规则计算
   */
  @Column({
    type: 'bigint',
    name: 'extra_fare_cents',
    default: 0,
    comment: '额外费用(分)',
  })
  extraFareCents: number;

  /**
   * 状态
   * PENDING=待审批 | APPROVED=已通过 | REJECTED=已拒绝
   * PAID=已支付 | CANCELLED=已取消
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
    name: 'status',
    default: 'PENDING',
    comment: '状态',
  })
  status: string;

  /** 审批备注（拒绝时必填）*/
  @Column({ type: 'text', name: 'approve_remark', nullable: true, comment: '审批备注' })
  approveRemark?: string | null;

  /** 审批人ID（商家员工）*/
  @Column({ type: 'int', name: 'approved_by', nullable: true, comment: '审批人' })
  approvedBy?: number | null;

  /** 审批时间 */
  @Column({ type: 'datetime', name: 'approved_at', nullable: true, comment: '审批时间' })
  approvedAt?: Date | null;

  /** 支付时间 */
  @Column({ type: 'datetime', name: 'paid_at', nullable: true, comment: '支付时间' })
  paidAt?: Date | null;
}
