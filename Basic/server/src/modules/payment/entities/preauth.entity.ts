/**
 * 预授权记录实体（preauths 表）
 * 管理车辆租赁的预授权冻结、解冻、扣款流程
 */
import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('preauths')
export class PreAuth extends BaseEntity {
  // ========== 基本信息 ==========

  /** 预授权流水号 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'preauth_no',
    comment: '预授权流水号',
  })
  preauthNo: string;

  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 关联订单 ID */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', nullable: true, comment: '订单ID' })
  orderId: number | null;

  // ========== 金额（分为单位） ==========

  /** 冻结总金额（分） */
  @Column({
    type: 'bigint',
    name: 'freeze_amount_cents',
    comment: '冻结金额(分)',
  })
  freezeAmountCents: number;

  /** 已扣款金额（分） */
  @Column({
    type: 'bigint',
    name: 'deducted_amount_cents',
    default: 0,
    comment: '已扣款(分)',
  })
  deductedAmountCents: number;

  /** 已解冻/退还金额（分） */
  @Column({
    type: 'bigint',
    name: 'released_amount_cents',
    default: 0,
    comment: '已解冻金额(分)',
  })
  releasedAmountCents: number;

  /** 剩余冻结金额（分）= freeze - deducted - released */
  @Column({
    type: 'bigint',
    name: 'remaining_amount_cents',
    default: 0,
    comment: '剩余冻结金额(分)',
  })
  remainingAmountCents: number;

  // ========== 状态 ==========

  /**
   * 预授权状态：0待确认 1已冻结 2部分扣款 3已解冻 4已关闭
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0待确认 1已冻结 2部分扣款 3已解冻 4已关闭',
  })
  status: number;

  // ========== 第三方信息 ==========

  /** 支付宝预授权协议号 */
  @Column({
    type: 'varchar',
    length: 128,
    name: 'agreement_no',
    nullable: true,
    comment: '支付宝预授权协议号',
  })
  agreementNo: string | null;

  /** 支付宝预授权单号 */
  @Column({
    type: 'varchar',
    length: 128,
    name: 'preauth_trade_no',
    nullable: true,
    comment: '预授权交易号',
  })
  preauthTradeNo: string | null;

  // ========== 时间 ==========

  /** 冻结时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'frozen_at',
    nullable: true,
    comment: '冻结时间',
  })
  frozenAt: Date | null;

  /** 解冻完成时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'released_at',
    nullable: true,
    comment: '解冻完成时间',
  })
  releasedAt: Date | null;
}
