/**
 * 用户优惠券实体（user_coupons 表）
 * 记录用户领取的优惠券及使用状态
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Coupon } from './coupon.entity';

@Entity('user_coupons')
export class UserCoupon extends BaseEntity {
  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 关联的优惠券模板 ID */
  @Index()
  @Column({ type: 'bigint', name: 'coupon_id', comment: '优惠券模板ID' })
  couponId: number;

  // ========== 状态与时间 ==========

  /**
   * 状态：0未使用 1已使用 2已过期
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0未使用 1已使用 2已过期',
  })
  status: number;

  /** 领取时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'received_at',
    nullable: true,
    comment: '领取时间',
  })
  receivedAt: Date | null;

  /** 使用时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'used_at',
    nullable: true,
    comment: '使用时间',
  })
  usedAt: Date | null;

  /** 实际生效开始时间（考虑 relative 模式） */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'valid_from',
    nullable: true,
    comment: '有效起始',
  })
  validFrom: Date | null;

  /** 实际失效截止时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'valid_to',
    nullable: true,
    comment: '有效截止',
  })
  validTo: Date | null;

  // ========== 使用记录 ==========

  /** 使用的订单 ID */
  @Column({
    type: 'bigint',
    name: 'order_id',
    nullable: true,
    comment: '使用的订单ID',
  })
  orderId: number | null;

  // ========== 来源追踪 ==========

  /**
   * 领取渠道：manual(手动发放)/task(任务领取)/invite(邀请奖励)/activity(活动)
   */
  @Column({
    type: 'enum',
    enum: ['manual', 'task', 'invite', 'activity'],
    name: 'source',
    default: 'manual',
    comment: '来源：manual/task/invite/activity',
  })
  source: 'manual' | 'task' | 'invite' | 'activity';

  /** 来源关联 ID（如任务ID、活动ID） */
  @Column({
    type: 'bigint',
    name: 'source_id',
    nullable: true,
    comment: '来源关联ID',
  })
  sourceId: number | null;

  // ========== 关系 ==========

  @ManyToOne(() => Coupon, (coupon) => coupon.userCoupons)
  @JoinColumn([{ name: 'coupon_id', referencedColumnName: 'id' }])
  coupon?: Coupon;
}
