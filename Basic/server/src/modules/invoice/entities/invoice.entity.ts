import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 发票记录 (T3W10-2)
 *
 * 用户对已完成的订单申请开票
 */
@Entity('invoice')
export class Invoice extends BaseEntity {
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 关联订单ID */
  @Column({ type: 'int', name: 'order_id', comment: '关联订单' })
  orderId: number;

  /** 关联抬头ID */
  @Column({ type: 'int', name: 'title_id', comment: '发票抬头ID' })
  titleId: number;

  /**
   * 发票类型
   */
  @Column({
    type: 'enum',
    enum: ['ELECTRONIC_NORMAL', 'PAPER_NORMAL', 'ELECTRONIC_SPECIAL', 'PAPER_SPECIAL'],
    name: 'invoice_type',
    default: 'ELECTRONIC_NORMAL',
    comment: '发票类型',
  })
  invoiceType: string;

  /** 发票金额(分) */
  @Column({ type: 'bigint', name: 'amount_cents', comment: '发票金额(分)' })
  amountCents: number;
  
  /**
   * 状态
   * PENDING=待开票 | ISSUED=已开具 | DELIVERED=已送达 | FAILED=开票失败 | CANCELLED=已取消
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'ISSUED', 'DELIVERED', 'FAILED', 'CANCELLED'],
    name: 'status',
    default: 'PENDING',
    comment: '状态',
  })
  status: string;

  /** 发票号码 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'invoice_no',
    nullable: true,
    comment: '发票号码',
  })
  invoiceNo?: string | null;

  /** 开票时间 */
  @Column({ type: 'datetime', name: 'issued_at', nullable: true, comment: '开票时间' })
  issuedAt?: Date | null;

  /** 邮寄/发送跟踪号 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'mail_tracking_no',
    nullable: true,
    comment: '邮寄跟踪号',
  })
  mailTrackingNo?: string | null;

  /** 失败原因 */
  @Column({ type: 'text', name: 'fail_reason', nullable: true, comment: '失败原因' })
  failReason?: string | null;
}
