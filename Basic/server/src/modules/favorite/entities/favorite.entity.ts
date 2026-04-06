/**
 * 用户收藏实体（favorites 表）
 * 简单关联表：用户收藏了哪些车辆
 */
import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('favorites')
export class Favorite {
  /** 主键ID - BIGINT 自增 */
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
    comment: '主键ID',
  })
  id: number;

  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 被收藏的车辆 ID */
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '被收藏的车辆ID' })
  vehicleId: number;

  /** 创建时间（即收藏时间） */
  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP(3)',
    comment: '收藏时间',
  })
  createdAt: Date;
}
