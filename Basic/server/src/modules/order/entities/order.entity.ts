/**
 * 订单实体（orders 表）
 * 核心业务实体：50+ 字段，包含费用明细全冗余、状态流转、优惠等
 * 状态枚举对齐 OrderStatus（10-80）
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { User } from '../../user/entities/user.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { Store } from '../../vehicle/entities/store.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { OrderLog } from './order-log.entity';
import { OrderStatus } from '../../../../shared/types/order.types';

@Entity('orders')
export class Order extends BaseEntity {
  // ========== 订单编号 ==========

  /** 订单编号（如 GY20260405001） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'order_no',
    comment: '订单编号',
  })
  orderNo: string;

  // ========== 关联主体 ==========

  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 车辆 ID */
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '车辆ID' })
  vehicleId: number;

  /** 门店 ID */
  @Index()
  @Column({ type: 'bigint', name: 'store_id', comment: '门店ID' })
  storeId: number;

  // ========== 状态机 ==========

  /**
   * 订单状态
   * 10待支付 20待取车 30使用中 40待还车 50待结算 60已完成 70已取消 80异常
   */
  @Index()
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 10,
    comment: '订单状态：10待支付 20待取车 30使用中 40待还车 50待结算 60已完成 70已取消 80异常',
  })
  status: OrderStatus;

  // ========== 时间节点 ==========

  /** 下单时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'ordered_at',
    nullable: true,
    comment: '下单时间',
  })
  orderedAt: Date | null;

  /** 支付时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'paid_at',
    nullable: true,
    comment: '支付时间',
  })
  paidAt: Date | null;

  /** 取车时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'picked_up_at',
    nullable: true,
    comment: '取车时间',
  })
  pickedUpAt: Date | null;

  /** 发起还车时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'return_requested_at',
    nullable: true,
    comment: '发起还车时间',
  })
  returnRequestedAt: Date | null;

  /** 还车确认时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'returned_at',
    nullable: true,
    comment: '还车确认时间',
  })
  returnedAt: Date | null;

  /** 结算完成时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'settled_at',
    nullable: true,
    comment: '结算完成时间',
  })
  settledAt: Date | null;

  /** 取消时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'cancelled_at',
    nullable: true,
    comment: '取消时间',
  })
  cancelledAt: Date | null;

  // ========== 地点信息（冗余） ==========

  /** 取车门店地址 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'pickup_address',
    nullable: true,
    comment: '取车地址(冗余)',
  })
  pickupAddress: string | null;

  /** 取车坐标(纬度) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'pickup_lat',
    nullable: true,
    comment: '取车纬度',
  })
  pickupLat: number | null;

  /** 取车坐标(经度) */
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 7,
    name: 'pickup_lng',
    nullable: true,
    comment: '取车经度',
  })
  pickupLng: number | null;

  /** 还车地点描述 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'return_location_desc',
    nullable: true,
    comment: '还车位置描述',
  })
  returnLocationDesc: string | null;

  /** 还车坐标(纬度) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'return_lat',
    nullable: true,
    comment: '还车纬度',
  })
  returnLat: number | null;

  /** 还车坐标(经度) */
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 7,
    name: 'return_lng',
    nullable: true,
    comment: '还车经度',
  })
  returnLng: number | null;

  // ========== 费用明细（分为单位，全部冗余） ==========

  /** 基础骑行费（分） */
  @Column({
    type: 'bigint',
    name: 'base_fare_cents',
    default: 0,
    comment: '基础骑行费(分)',
  })
  baseFareCents: number;

  /** 时段附加费（分） */
  @Column({
    type: 'bigint',
    name: 'time_surcharge_cents',
    default: 0,
    comment: '时段附加费(分)',
  })
  timeSurchargeCents: number;

  /** 里程费（分，超出免费范围后按公里计费） */
  @Column({
    type: 'bigint',
    name: 'distance_fare_cents',
    default: 0,
    comment: '里程费(分)',
  })
  distanceFareCents: number;

  /** 会员折扣减免（分） */
  @Column({
    type: 'bigint',
    name: 'member_discount_cents',
    default: 0,
    comment: '会员折扣减免(分)',
  })
  memberDiscountCents: number;

  /** 优惠券抵扣（分） */
  @Column({
    type: 'bigint',
    name: 'coupon_discount_cents',
    default: 0,
    comment: '优惠券抵扣(分)',
  })
  couponDiscountCents: number;

  /** 积分抵扣（分） */
  @Column({
    type: 'bigint',
    name: 'points_discount_cents',
    default: 0,
    comment: '积分抵扣(分)',
  })
  pointsDiscountCents: number;

  /** 其他优惠减免（分） */
  @Column({
    type: 'bigint',
    name: 'other_discount_cents',
    default: 0,
    comment: '其他优惠(分)',
  })
  otherDiscountCents: number;

  // ========== 总金额 ==========

  /** 订单原价总金额（分） */
  @Column({
    type: 'bigint',
    name: 'original_amount_cents',
    default: 0,
    comment: '订单原价(分)',
  })
  originalAmountCents: number;

  /** 优惠后应付金额（分） */
  @Column({
    type: 'bigint',
    name: 'payable_amount_cents',
    default: 0,
    comment: '应付金额(分)',
  })
  payableAmountCents: number;

  /** 实付金额（分） */
  @Column({
    type: 'bigint',
    name: 'paid_amount_cents',
    default: 0,
    comment: '实付金额(分)',
  })
  paidAmountCents: number;

  // ========== 骑行数据 ==========

  /** 实际骑行时长（秒） */
  @Column({
    type: 'int',
    name: 'duration_seconds',
    default: 0,
    comment: '骑行时长(秒)',
  })
  durationSeconds: number;

  /** 实际骑行距离（米） */
  @Column({
    type: 'int',
    name: 'distance_meters',
    default: 0,
    comment: '骑行距离(米)',
  })
  distanceMeters: number;

  // ========== 优惠关联 ==========

  /** 使用的用户优惠券 ID */
  @Column({
    type: 'bigint',
    name: 'user_coupon_id',
    nullable: true,
    comment: '使用的优惠券ID',
  })
  userCouponId: number | null;

  /** 使用的积分数量 */
  @Column({
    type: 'int',
    name: 'points_used',
    default: 0,
    comment: '使用积分',
  })
  pointsUsed: number;

  // ========== 取消/异常 ==========

  /** 取消原因 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'cancel_reason',
    nullable: true,
    comment: '取消原因',
  })
  cancelReason: string | null;

  /** 异常类型 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'abnormal_type',
    nullable: true,
    comment: '异常类型',
  })
  abnormalType: string | null;

  /** 异常备注 */
  @Column({
    type: 'text',
    name: 'abnormal_remark',
    nullable: true,
    comment: '异常备注',
  })
  abnormalRemark: string | null;

  // ========== 关系 ==========

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user?: User;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.orders)
  @JoinColumn([{ name: 'vehicle_id', referencedColumnName: 'id' }])
  vehicle?: Vehicle;

  @ManyToOne(() => Store, (store) => store.id)
  @JoinColumn([{ name: 'store_id', referencedColumnName: 'id' }])
  store?: Store;

  /** 一对多：支付记录 */
  @OneToMany(() => Payment, (payment) => payment.order)
  payments?: Payment[];

  /** 一对多：操作日志 */
  @OneToMany(() => OrderLog, (log) => log.order)
  logs?: OrderLog[];
}
