/**
 * 聊天持久化服务
 * 负责聊天消息的数据库存储和查询
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
  ) {}

  /** 持久化消息到数据库 */
  async saveMessage(msg: {
    id: string;
    conversationId: string;
    senderId: string;
    senderRole: string;
    content: string;
    type: string;
    metadata?: Record<string, any>;
    timestamp: number;
  }): Promise<ChatMessage> {
    const entity = this.msgRepo.create({
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      content: msg.content,
      msgType: msg.type || 'text',
      metadata: msg.metadata,
    });
    // Use the message timestamp for created_at
    entity.createdAt = new Date(msg.timestamp);

    const saved = await this.msgRepo.save(entity);
    this.logger.debug(`[Chat] 消息已持久化 id=${msg.id} conv=${msg.conversationId}`);
    return saved;
  }

  /** 查询会话历史消息 */
  async getConversationHistory(
    conversationId: string,
    query?: { page?: number; size?: number; beforeId?: number },
  ) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 50, 200);

    const qb = this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId })
      .andWhere('msg.deleted_at IS NULL')
      .orderBy('msg.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    if (query?.beforeId) {
      qb.andWhere('msg.id < :beforeId', { beforeId: query.beforeId });
    }

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  /** 获取用户的所有会话列表 */
  async getUserConversations(userId: string): Promise<string[]> {
    const result = await this.msgRepo
      .createQueryBuilder('msg')
      .select('DISTINCT msg.conversationId', 'conversationId')
      .where('msg.senderId = :userId', { userId })
      .orderBy('conversationId', 'DESC')
      .limit(50)
      .getRawMany();

    return result.map((r) => r.conversationId);
  }

  /** 标记消息已读 */
  async markAsRead(messageId: string, readBy: string): Promise<void> {
    await this.msgRepo.update(
      { senderId: readBy, readAt: null as any } as any,
      { readAt: new Date() },
    );
  }

  /** 获取会话未读消息数 */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return this.msgRepo.count({
      where: {
        conversationId,
        senderId: userId,
        readAt: null as any,
      } as any,
    });
  }
}
