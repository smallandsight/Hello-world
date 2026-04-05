/**
 * 支付记录实体（payments 表）
 * 记录所有支付操作（支付宝/微信等），支持多渠道
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('payments')
export class Payment extends BaseEntity {
  // ========== 基本信息 ==========

  /** 支付流水号 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'payment_no',
    comment: '支付流水号',
  })
  paymentNo: string;

  /** 关联订单 ID */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', comment: '订单ID' })
  orderId: number;

  // ========== 支付方式与金额 ==========

  /**
   * 支付渠道：alipay/wechat/balance/points
   */
  @Column({
    type: 'enum',
    enum: ['alipay', 'wechat', 'balance', 'points'],
    name: 'pay_channel',
    comment: '支付渠道：alipay/wechat/balance/points',
  })
  payChannel: 'alipay' | 'wechat' | 'balance' | 'points';

  /**
   * 支付类型：deposit(押金)/payment(订单付款)/preauth(预授权)
   */
  @Column({
    type: 'enum',
    enum: ['deposit', 'payment', 'preauth'],
    name: 'pay_type',
    default: 'payment',
    comment: '支付类型：deposit/payment/preauth',
  })
  payType: 'deposit' | 'payment' | 'preauth';

  /** 支付金额（分） */
  @Column({
    type: 'bigint',
    name: 'amount_cents',
    comment: '支付金额(分)',
  })
  amountCents: number;

  /** 货币单位，默认 CNY */
  @Column({
    type: 'varchar',
    length: 10,
    name: 'currency',
    default: 'CNY',
    comment: '货币单位',
  })
  currency: string;

  // ========== 状态 ==========

  /**
   * 支付状态：0待支付 1支付中 2已支付 3已退款 4已关闭 5失败
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0待支付 1支付中 2已支付 3已退款 4已关闭 5失败',
  })
  status: number;

  // ========== 第三方信息 ==========

  /** 第三方交易号（如支付宝 trade_no） */
  @Index()
  @Column({
    type: 'varchar',
    length: 128,
    name: 'trade_no',
    nullable: true,
    comment: '第三方交易号',
  })
  tradeNo: string | null;

  /** 回调通知数据 JSON（原始回调内容存档） */
  @Column({
    type: 'json',
    name: 'callback_data',
    nullable: true,
    select: false,
    comment: '回调数据JSON',
  })
  callbackData: any;

  // ========== 时间 ==========

  /** 支付超时截止时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'expire_at',
    nullable: true,
    comment: '支付超时时间',
  })
  expireAt: Date | null;

  /** 第三方支付完成时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'paid_at',
    nullable: true,
    comment: '实际支付时间',
  })
  paidAt: Date | null;

  // ========== 关系 ==========

  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn([{ name: 'order_id', referencedColumnName: 'id' }])
  order?: Order;
}
