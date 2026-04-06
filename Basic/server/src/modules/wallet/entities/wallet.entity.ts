import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 用户钱包 (T3W10-4)
 *
 * 每个用户一个钱包账户，用于充值/支付/退款
 * 使用乐观锁(version字段)防止并发问题
 */
@Entity('wallet')
export class Wallet extends BaseEntity {
  @Column({ type: 'int', name: 'user_id', unique: true, comment: '用户ID' })
  userId: number;

  /** 余额(分) */
  @Column({
    type: 'bigint',
    name: 'balance_cents',
    default: 0,
    comment: '余额(分)',
  })
  balanceCents: number;

  /** 冻结金额(分) — 如违章押金等 */
  @Column({
    type: 'bigint',
    name: 'frozen_amount',
    default: 0,
    comment: '冻结金额(分)',
  })
  frozenAmount: number;

  /**
   * 乐观锁版本号
   * 每次更新+1，用于防止并发修改导致余额不一致
   */
  @Column({
    type: 'int',
    name: 'version',
    default: 1,
    comment: '版本号(乐观锁)',
  })
  version: number;
}
