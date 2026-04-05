/**
 * TypeORM 实体基类
 * 所有业务实体必须继承此类，提供统一的审计字段和软删除能力
 *
 * 字段说明：
 * - id: BIGINT 自增主键
 * - createdAt / updatedAt: 自动维护的创建/更新时间（毫秒精度）
 * - deletedAt: 软删除标记，非 null 表示已删除
 * - createdBy / updatedBy: 操作人 ID（可选，用于审计追踪）
 */
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  /** 主键ID - BIGINT 自增 */
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
    comment: '主键ID',
  })
  id: number;

  /** 创建时间 - 毫秒精度 DATETIME(3) */
  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP(3)',
    comment: '创建时间',
  })
  createdAt: Date;

  /** 更新时间 - 毫秒精度 DATETIME(3) */
  @UpdateDateColumn({
    type: 'datetime',
    precision: 3,
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)',
    comment: '更新时间',
  })
  updatedAt: Date;

  /** 软删除时间 - 非null表示已删除 */
  @DeleteDateColumn({
    type: 'datetime',
    precision: 3,
    name: 'deleted_at',
    nullable: true,
    select: false, // 默认查询不包含此字段
    comment: '删除时间（软删除）',
  })
  deletedAt: Date | null;

  /** 创建人ID */
  @Column({
    type: 'bigint',
    name: 'created_by',
    nullable: true,
    select: false,
    comment: '创建人ID',
  })
  createdBy: number | null;

  /** 更新人ID */
  @Column({
    type: 'bigint',
    name: 'updated_by',
    nullable: true,
    select: false,
    comment: '更新人ID',
  })
  updatedBy: number | null;
}
