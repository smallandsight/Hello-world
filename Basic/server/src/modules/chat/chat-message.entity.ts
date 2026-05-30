/**
 * 聊天消息实体
 * 持久化 WebSocket 聊天消息到 MySQL
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_messages')
export class ChatMessage extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 64, name: 'conversation_id', comment: '会话ID' })
  conversationId: string;

  @Column({ type: 'varchar', length: 64, name: 'sender_id', comment: '发送者ID' })
  senderId: string;

  @Column({ type: 'varchar', length: 16, name: 'sender_role', comment: '角色 user/staff/bot/system' })
  senderRole: string;

  @Column({ type: 'varchar', length: 64, name: 'receiver_id', nullable: true, comment: '接收者ID' })
  receiverId?: string;

  @Column({ type: 'text', name: 'content', comment: '消息内容' })
  content: string;

  @Column({ type: 'varchar', length: 16, name: 'msg_type', default: 'text', comment: '消息类型' })
  msgType: string;

  @Column({ type: 'json', name: 'metadata', nullable: true, comment: '扩展数据' })
  metadata?: Record<string, any>;

  @Column({ type: 'datetime', precision: 3, name: 'read_at', nullable: true, comment: '已读时间' })
  readAt?: Date;
}
