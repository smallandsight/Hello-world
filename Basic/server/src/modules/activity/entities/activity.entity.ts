import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 活动类型枚举
 */
export enum ActivityType {
  /** 限时特价 */
  FLASH_SALE = 'flash_sale',
  /** 满减活动 */
  DISCOUNT = 'discount',
  /** 新人专享 */
  NEW_USER = 'new_user',
  /** 会员专享 */
  MEMBER_ONLY = 'member_only',
  /** 邀请有礼 */
  INVITATION = 'invitation',
  /** 签到活动 */
  CHECK_IN = 'check_in',
}

/**
 * 活动状态枚举
 */
export enum ActivityStatus {
  /** 草稿 */
  DRAFT = 'draft',
  /** 已上架 */
  ACTIVE = 'active',
  /** 已下架 */
  INACTIVE = 'inactive',
  /** 已结束 */
  ENDED = 'ended',
}

/**
 * 活动配置Entity
 */
@Entity('activity')
@Index(['status', 'startTime', 'endTime'])
export class Activity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 活动名称 */
  @Column({ type: 'varchar', length: 100, comment: '活动名称' })
  name: string;

  /** 活动类型 */
  @Column({
    type: 'enum',
    enum: ActivityType,
    comment: '活动类型',
  })
  type: ActivityType;

  /** 活动状态 */
  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.DRAFT,
    comment: '活动状态',
  })
  status: ActivityStatus;

  /** 活动描述 */
  @Column({ type: 'text', nullable: true, comment: '活动描述' })
  description: string;

  /** 活动封面图 */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '活动封面图' })
  coverImage: string;

  /** 开始时间 */
  @Column({ type: 'datetime', comment: '开始时间' })
  startTime: Date;

  /** 结束时间 */
  @Column({ type: 'datetime', comment: '结束时间' })
  endTime: Date;

  /** 活动规则 JSON */
  @Column({ type: 'json', comment: '活动规则' })
  rules: ActivityRules;

  /** 发放总量 */
  @Column({ type: 'int', default: 0, comment: '发放总量' })
  quota: number;

  /** 已使用量 */
  @Column({ type: 'int', default: 0, comment: '已使用量' })
  usedCount: number;

  /** 参与人数 */
  @Column({ type: 'int', default: 0, comment: '参与人数' })
  participantCount: number;

  /** 是否需要登录 */
  @Column({ type: 'boolean', default: true, comment: '是否需要登录' })
  requireLogin: boolean;

  /** 每人限领次数 */
  @Column({ type: 'int', default: 1, comment: '每人限领次数' })
  limitPerUser: number;

  /** 排序权重 */
  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sort: number;

  /** 创建人ID */
  @Column({ type: 'bigint', nullable: true, comment: '创建人ID' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}

/**
 * 活动规则接口
 */
export interface ActivityRules {
  /** 折扣类型: fixed(固定金额) / percent(百分比) */
  discountType?: 'fixed' | 'percent';
  /** 折扣值 */
  discountValue?: number;
  /** 最低消费金额（分） */
  minAmount?: number;
  /** 最大优惠金额（分） */
  maxDiscount?: number;
  /** 适用车型ID列表 */
  applicableModels?: string[];
  /** 适用门店ID列表 */
  applicableStores?: string[];
  /** 适用用户类型: all / new / member */
  applicableUsers?: string;
  /** 自定义规则 */
  customRules?: Record<string, any>;
}