/**
 * 优惠券模板实体（coupons 表）
 * 定义优惠券的优惠规则、适用范围、发放限制等
 */
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { UserCoupon } from './user-coupon.entity';

@Entity('coupons')
export class Coupon extends BaseEntity {
  /** 优惠券名称 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'coupon_name',
    comment: '优惠券名称',
  })
  couponName: string;

  /** 优惠券编码（唯一标识） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'coupon_code',
    comment: '优惠券编码',
  })
  couponCode: string;

  // ========== 优惠规则 ==========

  /**
   * 优惠类型：fixed(固定金额)/percent(折扣)
   */
  @Column({
    type: 'enum',
    enum: ['fixed', 'percent'],
    name: 'discount_type',
    comment: '优惠类型：fixed/percent',
  })
  discountType: 'fixed' | 'percent';

  /** 优惠值（固定金额=分，折扣=百分比如85表示85折） */
  @Column({
    type: 'bigint',
    name: 'discount_value',
    comment: '优惠值(分或%)',
  })
  discountValue: number;

  /** 使用门槛（最低订单金额，分为单位，0=无门槛） */
  @Column({
    type: 'bigint',
    name: 'min_order_amount_cents',
    default: 0,
    comment: '使用门槛(分)',
  })
  minOrderAmountCents: number;

  /** 最大抵扣金额（分，仅 percent 类型时有效） */
  @Column({
    type: 'bigint',
    name: 'max_discount_cents',
    nullable: true,
    comment: '最大抵扣(分)',
  })
  maxDiscountCents: number | null;

  // ========== 适用范围 ==========

  /**
   * 适用范围类型：all(全部)/vehicle_type(指定车型)/store(指定门店)
   */
  @Column({
    type: 'enum',
    enum: ['all', 'vehicle_type', 'store'],
    name: 'scope_type',
    default: 'all',
    comment: '适用范围：all/vehicle_type/store',
  })
  scopeType: 'all' | 'vehicle_type' | 'store';

  /** 范围限定值 JSON（车型ID列表或门店ID列表） */
  @Column({
    type: 'json',
    name: 'scope_values',
    nullable: true,
    comment: '适用范围值JSON [ids]',
  })
  scopeValues: any;

  // ========== 发放与有效期 ==========

  /** 总发放数量上限（0=不限） */
  @Column({
    type: 'int',
    name: 'total_count',
    default: 0,
    comment: '总发放量(0不限)',
  })
  totalCount: number;

  /** 每人限领数量 */
  @Column({
    type: 'smallint',
    name: 'per_user_limit',
    default: 1,
    comment: '每人限领数',
  })
  perUserLimit: number;

  /** 已发放数量 */
  @Column({
    type: 'int',
    name: 'issued_count',
    default: 0,
    comment: '已发放数量',
  })
  issuedCount: number;

  /**
   * 有效期类型：fixed(固定日期)/relative(领取后N天有效)
   */
  @Column({
    type: 'enum',
    enum: ['fixed', 'relative'],
    name: 'valid_type',
    default: 'relative',
    comment: '有效期类型：fixed/relative',
  })
  validType: 'fixed' | 'relative';

  /** 固定开始时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'valid_start_at',
    nullable: true,
    comment: '有效起始时间',
  })
  validStartAt: Date | null;

  /** 固定截止时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'valid_end_at',
    nullable: true,
    comment: '有效截止时间',
  })
  validEndAt: Date | null;

  /** 相对有效天数（领取后N天有效） */
  @Column({
    type: 'smallint',
    name: 'valid_days',
    nullable: true,
    comment: '有效天数(relative模式)',
  })
  validDays: number | null;

  // ========== 展示 ==========

  /** 优惠券描述/使用说明 */
  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
    comment: '描述/说明',
  })
  description: string | null;

  /** 是否启用 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否启用',
  })
  isActive: number;

  // ========== 关系 ==========

  @OneToMany(() => UserCoupon, (uc) => uc.coupon)
  userCoupons?: UserCoupon[];
}
