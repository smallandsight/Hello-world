/**
 * 消息日志实体（message_log 表）
 * 记录所有推送的消息（订单状态变更通知、营销推送、系统公告等）
 */
import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('message_log')
export class MessageLog extends BaseEntity {
  // ========== 接收者 ==========

  /** 用户 ID（目标接收人） */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  // ========== 消息内容 ==========

  /**
   * 消息类型：order_status(订单状态)/system(系统公告)
   * /marketing(营销活动)/coupon(优惠券到账)
   */
  @Column({
    type: 'enum',
    enum: ['order_status', 'system', 'marketing', 'coupon'],
    name: 'message_type',
    comment: '消息类型：order_status/system/marketing/coupon',
  })
  messageType: 'order_status' | 'system' | 'marketing' | 'coupon';

  /** 消息标题 */
  @Column({
    type: 'varchar',
    length: 200,
    name: 'title',
    comment: '消息标题',
  })
  title: string;

  /** 消息内容/正文 */
  @Column({
    type: 'text',
    name: 'content',
    nullable: true,
    comment: '消息正文',
  })
  content: string | null;

  // ========== 推送渠道 ==========

  /**
   * 推送渠道：push(小程序订阅消息)/sms(短信)/in_app(站内信)
   */
  @Column({
    type: 'enum',
    enum: ['push', 'sms', 'in_app'],
    name: 'channel',
    default: 'in_app',
    comment: '推送渠道：push/sms/in_app',
  })
  channel: 'push' | 'sms' | 'in_app';

  /** 关联业务 ID（如订单号） */
  @Column({
    type: 'bigint',
    name: 'biz_id',
    nullable: true,
    comment: '关联业务ID',
  })
  bizId: number | null;

  /** 模板 ID（支付宝订阅消息模板） */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'template_id',
    nullable: true,
    comment: '消息模板ID',
  })
  templateId: string | null;

  // ========== 状态与时间 ==========

  /** 是否已读 */
  @Column({
    type: 'tinyint',
    name: 'is_read',
    default: 0,
    comment: '是否已读：0未读 1已读',
  })
  isRead: number;

  /** 阅读时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'read_at',
    nullable: true,
    comment: '阅读时间',
  })
  readAt: Date | null;

  /** 发送时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'sent_at',
    nullable: true,
    comment: '发送时间',
  })
  sentAt: Date | null;

  /** 发送结果：success/failed/pending */
  @Column({
    type: 'enum',
    enum: ['pending', 'success', 'failed'],
    name: 'send_status',
    default: 'pending',
    comment: '发送结果：pending/success/failed',
  })
  sendStatus: 'pending' | 'success' | 'failed';

  /** 失败原因 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'fail_reason',
    nullable: true,
    comment: '失败原因',
  })
  failReason: string | null;
}
