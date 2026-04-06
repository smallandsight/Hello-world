import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Activity } from './activity.entity';

/**
 * 限时特价配置Entity
 */
@Entity('flash_sale')
@Index(['activityId', 'modelId'], { unique: true })
export class FlashSale {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 关联活动ID */
  @Column({ type: 'bigint', comment: '关联活动ID' })
  activityId: string;

  @ManyToOne(() => Activity)
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  /** 车型ID */
  @Column({ type: 'bigint', comment: '车型ID' })
  modelId: string;

  /** 车型名称（冗余） */
  @Column({ type: 'varchar', length: 100, comment: '车型名称' })
  modelName: string;

  /** 原价（分） */
  @Column({ type: 'bigint', comment: '原价（分）' })
  originalPriceCents: string;

  /** 特价（分） */
  @Column({ type: 'bigint', comment: '特价（分）' })
  specialPriceCents: string;

  /** 折扣比例 * 100 */
  @Column({ type: 'int', comment: '折扣比例*100' })
  discountRatio: number;

  /** 库存数量 */
  @Column({ type: 'int', comment: '库存数量' })
  stock: number;

  /** 已售数量 */
  @Column({ type: 'int', default: 0, comment: '已售数量' })
  soldCount: number;

  /** 每人限购 */
  @Column({ type: 'int', default: 1, comment: '每人限购' })
  limitPerUser: number;

  /** 状态 */
  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}