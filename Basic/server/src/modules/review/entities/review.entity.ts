/**
 * 用户评价实体（reviews 表）
 * 记录用户对车辆/订单的评价信息
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 评价审核状态 */
export enum ReviewStatus {
  /** 待审核 */
  PENDING = 'PENDING',
  /** 审核通过（已发布） */
  APPROVED = 'APPROVED',
  /** 审核拒绝 */
  REJECTED = 'REJECTED',
  /** 已隐藏（用户删除/违规） */
  HIDDEN = 'HIDDEN',
}

@Entity('reviews')
export class Review extends BaseEntity {
  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '评价用户ID' })
  userId: number;

  /** 关联订单 ID（每订单限评1次） */
  @Index({ unique: true })
  @Column({ type: 'bigint', name: 'order_id', comment: '关联订单ID', unique: true })
  orderId: number;

  /** 关联车辆 ID */
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '被评价车辆ID' })
  vehicleId: number;

  // ========== 评分与内容 ==========

  /** 综合评分 (1-5) */
  @Column({
    type: 'tinyint',
    name: 'rating',
    comment: '综合评分(1-5)',
  })
  rating: number;

  /** 评价文字内容 */
  @Column({
    type: 'text',
    name: 'content',
    nullable: true,
    comment: '评价内容',
  })
  content: string | null;

  /** 图片URL列表 JSON（最多9张） */
  @Column({
    type: 'json',
    name: 'images',
    nullable: true,
    comment: '图片列表JSON [urls]',
  })
  images: string[] | null;

  /** 标签列表 JSON（如"车况好"、"干净整洁"等） */
  @Column({
    type: 'json',
    name: 'tags',
    nullable: true,
    comment: '标签JSON ["tag1","tag2"]',
  })
  tags: string[] | null;

  // ========== 商家回复 ==========

  /** 商家回复内容 */
  @Column({
    type: 'text',
    name: 'reply_content',
    nullable: true,
    comment: '商家回复内容',
  })
  replyContent: string | null;

  /** 回复时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'replied_at',
    nullable: true,
    comment: '商家回复时间',
  })
  repliedAt: Date | null;

  // ========== 审核 ==========

  /**
   * 审核状态：PENDING / APPROVED / REJECTED / HIDDEN
   */
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    name: 'status',
    default: ReviewStatus.PENDING,
    comment: '审核状态',
  })
  status: ReviewStatus;

  /** 审核结果备注 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'audit_result',
    nullable: true,
    comment: '审核结果说明',
  })
  auditResult: string | null;
}
