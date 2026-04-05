/**
 * 客服工单实体（tickets 表）
 * 管理用户提交的问题反馈、投诉、异常处理等
 */
import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { TicketReply } from './ticket-reply.entity';

@Entity('tickets')
export class Ticket extends BaseEntity {
  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  // ========== 工单信息 ==========

  /** 工单编号 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'ticket_no',
    comment: '工单编号',
  })
  ticketNo: string;

  /**
   * 工单类型：complaint(投诉)/problem(问题咨询)/accident(事故报告)/other(其他)
   */
  @Column({
    type: 'enum',
    enum: ['complaint', 'problem', 'accident', 'other'],
    name: 'ticket_type',
    default: 'problem',
    comment: '类型：complaint/problem/accident/other',
  })
  ticketType: 'complaint' | 'problem' | 'accident' | 'other';

  /** 工单标题 */
  @Column({
    type: 'varchar',
    length: 200,
    name: 'title',
    comment: '标题',
  })
  title: string;

  /** 工单内容描述 */
  @Column({
    type: 'text',
    name: 'content',
    comment: '内容描述',
  })
  content: string;

  /** 关联订单 ID（可选） */
  @Index()
  @Column({ type: 'bigint', name: 'order_id', nullable: true, comment: '关联订单ID' })
  orderId: number | null;

  // ========== 状态与优先级 ==========

  /**
   * 状态：0待处理 1处理中 2待用户确认 3已关闭
   */
  @Index()
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0待处理 1处理中 2待确认 3已关闭',
  })
  status: number;

  /**
   * 优先级：1低 2中 3高 4紧急
   */
  @Column({
    type: 'tinyint',
    name: 'priority',
    default: 2,
    comment: '优先级：1低 2中 3高 4紧急',
  })
  priority: number;

  // ========== SLA 指标 ==========

  /** 响应截止时间（SLA） */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'response_deadline_at',
    nullable: true,
    comment: '响应SLA截止时间',
  })
  responseDeadlineAt: Date | null;

  /** 首次响应时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'first_response_at',
    nullable: true,
    comment: '首次响应时间',
  })
  firstResponseAt: Date | null;

  // ========== 处理人 ==========

  /** 分配的处理客服人员 ID */
  @Column({
    type: 'bigint',
    name: 'assignee_id',
    nullable: true,
    comment: '处理人ID',
  })
  assigneeId: number | null;

  // ========== 附件 ==========

  /** 图片附件 URL 列表 JSON */
  @Column({
    type: 'json',
    name: 'images',
    nullable: true,
    comment: '图片附件JSON [urls]',
  })
  images: any;

  // ========== 满意度 ==========

  /**
   * 用户满意度：1非常不满意 2不满意 3一般 4满意 5非常满意
   */
  @Column({
    type: 'tinyint',
    name: 'satisfaction_score',
    nullable: true,
    comment: '满意度(1-5)',
  })
  satisfactionScore: number | null;

  // ========== 关系 ==========

  @OneToMany(() => TicketReply, (reply) => reply.ticket)
  replies?: TicketReply[];
}
