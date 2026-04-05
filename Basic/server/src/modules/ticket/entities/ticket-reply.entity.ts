/**
 * 工单回复实体（ticket_replies 表）
 * 记录工单的所有回复记录（用户/客服双向）
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_replies')
export class TicketReply extends BaseEntity {
  /** 工单 ID */
  @Index()
  @Column({ type: 'bigint', name: 'ticket_id', comment: '工单ID' })
  ticketId: number;

  // ========== 回复信息 ==========

  /**
   * 回复者类型：user(用户)/staff(客服)/system(系统)
   */
  @Column({
    type: 'enum',
    enum: ['user', 'staff', 'system'],
    name: 'replyer_type',
    default: 'user',
    comment: '回复者：user/staff/system',
  })
  replyerType: 'user' | 'staff' | 'system';

  /** 回复者 ID */
  @Column({
    type: 'bigint',
    name: 'replyer_id',
    nullable: true,
    comment: '回复者ID',
  })
  replyerId: number | null;

  /** 回复内容 */
  @Column({
    type: 'text',
    name: 'content',
    comment: '回复内容',
  })
  content: string;

  // ========== 附件 ==========

  /** 图片附件 URL 列表 JSON */
  @Column({
    type: 'json',
    name: 'images',
    nullable: true,
    comment: '图片附件JSON [urls]',
  })
  images: any;

  // ========== 关系 ==========

  @ManyToOne(() => Ticket, (ticket) => ticket.replies)
  @JoinColumn([{ name: 'ticket_id', referencedColumnName: 'id' }])
  ticket?: Ticket;
}
