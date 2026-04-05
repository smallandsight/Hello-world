/**
 * 订单操作日志实体（order_logs 表）
 * 记录订单全生命周期的状态变更和关键操作
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Order } from './order.entity';

@Entity('order_logs')
export class OrderLog extends BaseEntity {
  /** 订单 ID */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', comment: '订单ID' })
  orderId: number;

  // ========== 操作信息 ==========

  /** 操作类型：status_change/payment/pickup/return/cancel/settle/refund */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'action',
    comment: '操作类型',
  })
  action: string;

  /** 操作前状态（状态变更时记录） */
  @Column({
    type: 'tinyint',
    name: 'from_status',
    nullable: true,
    comment: '变更前状态',
  })
  fromStatus: number | null;

  /** 操作后状态 */
  @Column({
    type: 'tinyint',
    name: 'to_status',
    nullable: true,
    comment: '变更后状态',
  })
  toStatus: number | null;

  // ========== 操作者 ==========

  /**
   * 操作者类型：user(用户)/system(系统自动)/staff(商家)
   */
  @Column({
    type: 'enum',
    enum: ['user', 'system', 'staff'],
    name: 'operator_type',
    default: 'user',
    comment: '操作者类型：user/system/staff',
  })
  operatorType: 'user' | 'system' | 'staff';

  /** 操作者 ID */
  @Column({
    type: 'bigint',
    name: 'operator_id',
    nullable: true,
    comment: '操作者ID',
  })
  operatorId: number | null;

  // ========== 变更内容 ==========

  /** 变更详情 JSON（如费用变化、地址变更等） */
  @Column({
    type: 'json',
    name: 'change_content',
    nullable: true,
    comment: '变更内容JSON',
  })
  changeContent: any;

  /** 备注说明 */
  @Column({
    type: 'text',
    name: 'remark',
    nullable: true,
    comment: '备注',
  })
  remark: string | null;

  // ========== 关系 ==========

  @ManyToOne(() => Order, (order) => order.logs)
  @JoinColumn([{ name: 'order_id', referencedColumnName: 'id' }])
  order?: Order;
}
