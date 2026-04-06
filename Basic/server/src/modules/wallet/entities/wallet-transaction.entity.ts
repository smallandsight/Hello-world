import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 钱包交易流水 (T3W10-4)
 *
 * 每一笔余额变动都记录流水，支持对账
 */
@Entity('wallet_transaction')
export class WalletTransaction extends BaseEntity {
  @Column({ type: 'int', name: 'wallet_id', comment: '钱包ID' })
  walletId: number;

  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  userId: number;

  /**
   * 交易类型
   * RECHARGE=充值 | PAY=支付 | REFUND=退款
   * DEDUCTION=扣除(违章等) | REBATE=返还/补偿
   */
  @Column({
    type: 'enum',
    enum: ['RECHARGE', 'PAY', 'REFUND', 'DEDUCTION', 'REBATE'],
    name: 'type',
    comment: '交易类型',
  })
  type: string;

  /** 变动金额(分) — 正数为增加(充值/退款/返还)，负数为减少(支付/扣除) */
  @Column({
    type: 'bigint',
    name: 'amount_cents',
    comment: '变动金额(分)',
  })
  amountCents: number;

  /** 交易后余额(分) — 快照值用于校验 */
  @Column({
    type: 'bigint',
    name: 'balance_after_cents',
    comment: '变动后余额(分)',
  })
  balanceAfterCents: number;

  /** 关联订单ID（支付/退款时关联）*/
  @Column({
    type: 'int',
    name: 'order_id',
    nullable: true,
    comment: '关联订单ID',
  })
  orderId?: number;

  /** 备注 */
  @Column({ type: 'text', name: 'remark', nullable: true, comment: '备注' })
  remark?: string;
}
