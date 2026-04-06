import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 满减规则Entity
 */
@Entity('discount_rule')
@Index(['status', 'minAmount'])
export class DiscountRule {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 规则名称 */
  @Column({ type: 'varchar', length: 100, comment: '规则名称' })
  name: string;

  /** 最低消费金额（分） */
  @Column({ type: 'bigint', comment: '最低消费金额（分）' })
  minAmountCents: string;

  /** 减免金额（分） */
  @Column({ type: 'bigint', comment: '减免金额（分）' })
  discountAmountCents: string;

  /** 最大优惠金额（分） */
  @Column({ type: 'bigint', nullable: true, comment: '最大优惠金额（分）' })
  maxDiscountCents: string;

  /** 规则描述 */
  @Column({ type: 'varchar', length: 200, nullable: true, comment: '规则描述' })
  description: string;

  /** 适用类型: order(订单) / rental(租金) */
  @Column({ type: 'varchar', length: 20, default: 'order', comment: '适用类型' })
  applyTo: string;

  /** 优先级 */
  @Column({ type: 'int', default: 0, comment: '优先级' })
  priority: number;

  /** 状态 */
  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  status: boolean;

  /** 开始时间 */
  @Column({ type: 'datetime', nullable: true, comment: '开始时间' })
  startTime: Date;

  /** 结束时间 */
  @Column({ type: 'datetime', nullable: true, comment: '结束时间' })
  endTime: Date;

  /** 使用次数 */
  @Column({ type: 'int', default: 0, comment: '使用次数' })
  usedCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}