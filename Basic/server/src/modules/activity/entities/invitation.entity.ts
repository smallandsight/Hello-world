import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 邀请记录状态
 */
export enum InvitationStatus {
  /** 待完成 */
  PENDING = 'pending',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已奖励 */
  REWARDED = 'rewarded',
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/**
 * 邀请记录Entity
 */
@Entity('invitation')
@Index(['inviterId'])
@Index(['inviteeCode'])
export class Invitation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 邀请人ID */
  @Column({ type: 'bigint', comment: '邀请人ID' })
  inviterId: string;

  /** 邀请码 */
  @Column({ type: 'varchar', length: 20, unique: true, comment: '邀请码' })
  inviteeCode: string;

  /** 被邀请人ID */
  @Column({ type: 'bigint', nullable: true, comment: '被邀请人ID' })
  inviteeId: string;

  /** 状态 */
  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
    comment: '状态',
  })
  status: InvitationStatus;

  /** 奖励积分 */
  @Column({ type: 'int', default: 0, comment: '奖励积分' })
  rewardPoints: number;

  /** 奖励优惠券ID */
  @Column({ type: 'bigint', nullable: true, comment: '奖励优惠券ID' })
  rewardCouponId: string;

  /** 奖励发放时间 */
  @Column({ type: 'datetime', nullable: true, comment: '奖励发放时间' })
  rewardedAt: Date;

  /** 完成条件：首单金额（分） */
  @Column({ type: 'bigint', nullable: true, comment: '完成条件金额' })
  conditionAmountCents: string;

  /** 备注说明 */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '备注说明' })
  remark: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}