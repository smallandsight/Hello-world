/**
 * 积分记录实体（points_records 表）
 * 记录用户积分的所有变动（获取/消费/过期/管理员调整）
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('points_records')
export class PointsRecord extends BaseEntity {
  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  // ========== 变动信息 ==========

  /**
   * 变动类型：earn(获取)/spend(消费)/expire(过期)/refund(退还)/adjust(管理员调整)
   */
  @Column({
    type: 'enum',
    enum: ['earn', 'spend', 'expire', 'refund', 'adjust'],
    name: 'change_type',
    comment: '变动类型：earn/spend/expire/refund/adjust',
  })
  changeType: 'earn' | 'spend' | 'expire' | 'refund' | 'adjust';

  /** 变动积分数量（正数增加，负数减少） */
  @Column({
    type: 'int',
    name: 'points_change',
    comment: '变动积分(正增负减)',
  })
  pointsChange: number;

  /** 变动后的积分余额快照 */
  @Column({
    type: 'int',
    name: 'balance_after',
    comment: '变动后余额',
  })
  balanceAfter: number;

  // ========== 关联 ==========

  /** 关联订单 ID（订单相关变动时记录） */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', nullable: true, comment: '关联订单ID' })
  orderId: number | null;

  // ========== 描述 ==========

  /** 变动描述（如"骑行奖励+10"、"使用优惠券抵扣-50"等） */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'description',
    nullable: true,
    comment: '变动描述',
  })
  description: string | null;

  /** 备注（管理员调整时的说明） */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'remark',
    nullable: true,
    comment: '备注',
  })
  remark: string | null;
}
