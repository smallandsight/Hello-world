/**
 * 用户反馈实体（feedbacks 表）
 * 记录用户的功能建议、Bug报告、投诉等反馈
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 反馈处理状态 */
export enum FeedbackStatus {
  /** 待处理 */
  PENDING = 'PENDING',
  /** 处理中 */
  PROCESSING = 'PROCESSING',
  /** 已解决 */
  RESOLVED = 'RESOLVED',
  /** 已关闭 */
  CLOSED = 'CLOSED',
}

/** 反馈分类 */
export enum FeedbackCategory {
  /** 功能建议 */
  FEATURE_SUGGESTION = 'FEATURE_SUGGESTION',
  /** Bug报告 */
  BUG_REPORT = 'BUG_REPORT',
  /** 投诉 */
  COMPLAINT = 'COMPLAINT',
  /** 其他 */
  OTHER = 'OTHER',
}

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '提交用户ID' })
  userId: number;

  // ========== 分类与内容 ==========

  /**
   * 反馈分类
   */
  @Column({
    type: 'enum',
    enum: FeedbackCategory,
    name: 'category',
    comment: '分类：FEATURE_SUGGESTION/BUG_REPORT/COMPLAINT/OTHER',
  })
  category: FeedbackCategory;

  /**
   * 反馈内容
   */
  @Column({
    type: 'text',
    name: 'content',
    comment: '反馈内容',
  })
  content: string;

  /**
   * 图片/附件 URL 列表 JSON
   */
  @Column({
    type: 'json',
    name: 'images',
    nullable: true,
    comment: '图片列表JSON [urls]',
  })
  images: string[] | null;

  // ========== 联系方式 ==========

  /** 联系手机号 */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'contact_phone',
    nullable: true,
    comment: '联系手机号',
  })
  contactPhone: string | null;

  /** 联系邮箱 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'contact_email',
    nullable: true,
    comment: '联系邮箱',
  })
  contactEmail: string | null;

  // ========== 处理状态 ==========

  /**
   * 处理状态：PENDING / PROCESSING / RESOLVED / CLOSED
   */
  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    name: 'status',
    default: FeedbackStatus.PENDING,
    comment: '处理状态',
  })
  status: FeedbackStatus;

  /** 客服回复内容 */
  @Column({
    type: 'text',
    name: 'staff_reply',
    nullable: true,
    comment: '客服回复',
  })
  staffReply: string | null;

  /** 回复时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'replied_at',
    nullable: true,
    comment: '回复时间',
  })
  repliedAt: Date | null;
}
