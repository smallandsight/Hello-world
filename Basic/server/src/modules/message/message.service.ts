import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual } from 'typeorm';
import { MessageLog } from './entities/message-log.entity';
import { RedisService } from '../../common/redis/redis.service';

/** 消息类型枚举 */
export type MessageType = 'order_status' | 'system' | 'marketing' | 'coupon';

/** 推送渠道枚举 */
export type ChannelType = 'push' | 'sms' | 'in_app';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(MessageLog)
    private readonly messageRepo: Repository<MessageLog>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  // ========== 用户端：消息查询 ==========

  /**
   * 获取用户消息列表（分页）
   * 支持按消息类型筛选
   */
  async getMessageList(userId: number, query: any): Promise<any> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 20, 50);
    const type = query.type as MessageType | undefined;

    // 构建查询
    const qb = this.messageRepo.createQueryBuilder('msg')
      .where('msg.user_id = :userId', { userId })
      .orderBy('msg.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    if (type) {
      qb.andWhere('msg.message_type = :type', { type });
    }

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((m) => ({
        id: m.id,
        type: m.messageType,
        title: m.title,
        content: m.content,
        channel: m.channel,
        bizId: m.bizId,
        isRead: m.isRead === 1,
        readAt: m.readAt,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 标记单条消息已读
   */
  async markAsRead(messageId: number): Promise<void> {
    await this.messageRepo.update(
      { id: messageId },
      {
        isRead: 1,
        readAt: new Date(),
      },
    );
  }

  /**
   * 标记所有消息已读
   */
  async markAllRead(userId: number): Promise<number> {
    const result = await this.messageRepo.update(
      { userId, isRead: 0 },
      { isRead: 1, readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  /**
   * 获取未读消息数量
   * 使用 Redis 缓存，减少数据库压力
   */
  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const cacheKey = `msg:unread:${userId}`;

    // 尝试从缓存读取
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached !== null) {
        return { count: Number(cached) };
      }
    } catch {
      // Redis 不可用时降级到数据库
    }

    const count = await this.messageRepo.count({
      where: { userId, isRead: 0 },
    });

    // 写入缓存（5分钟过期）
    try {
      await this.redisService.setex(cacheKey, 300, String(count));
    } catch {
      // 缓存写入失败不影响主流程
    }

    return { count };
  }

  /**
   * 获取用户消息摘要（用于首页展示）
   */
  async getMessageSummary(userId: number): Promise<{
    unreadCount: number;
    latestMessages: Array<{
      id: number;
      type: string;
      title: string;
      createdAt: Date;
    }>;
  }> {
    const [unreadCountResult, latestMessages] = await Promise.all([
      this.getUnreadCount(userId),
      this.messageRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 3,
        select: ['id', 'messageType', 'title', 'createdAt'],
      }),
    ]);

    return {
      unreadCount: unreadCountResult.count,
      latestMessages: latestMessages.map((m) => ({
        id: m.id,
        type: m.messageType,
        title: m.title,
        createdAt: m.createdAt,
      })),
    };
  }

  // ========== 消息发送（供其他模块调用）==========

  /**
   * 发送站内信（核心方法）
   * 由 OrderService / CouponService 等业务模块调用
   *
   * 流程：
   * 1. 写入 message_log 表
   * 2. 清除该用户的未读数缓存
   * 3. 如果是 push 渠道，触发微信订阅消息推送
   */
  async sendMessage(params: {
    userId: number;
    type: MessageType;
    title: string;
    content?: string;
    channel?: ChannelType;
    bizId?: number;
    templateId?: string;
  }): Promise<MessageLog> {
    const message = this.messageRepo.create({
      userId: params.userId,
      messageType: params.type,
      title: params.title,
      content: params.content || '',
      channel: params.channel || 'in_app',
      bizId: params.bizId || null,
      templateId: params.templateId || null,
      isRead: 0,
      sendStatus: 'pending',
    });

    const saved = await this.messageRepo.save(message);

    // 异步清除缓存 + 推送（不阻塞主流程）
    setImmediate(async () => {
      try {
        // 清除未读数缓存
        await this.redisService.del(`msg:unread:${params.userId}`);

        // 如果需要推送订阅消息
        if (params.channel === 'push') {
          await this.sendWechatSubscribeMessage(saved);
        }
      } catch (err) {
        this.logger.error(`发送消息后处理失败: ${err.message}`, err.stack);
      }
    });

    return saved;
  }

  /**
   * 批量发送消息（如系统公告）
   */
  async broadcastMessage(params: {
    type: MessageType;
    title: string;
    content?: string;
    channel?: ChannelType;
    userIds?: number[];
    sendAll?: boolean; // true 表示全员广播
  }): Promise<{ sent: number; failed: number }> {
    let targetUserIds: number[] = [];

    if (params.sendAll && !params.userIds?.length) {
      // 全员广播：获取所有活跃用户
      // 实际项目中应从 user 表查询，这里简化处理
      throw new Error('全员广播需指定 userIds 或实现用户查询逻辑');
    } else if (params.userIds) {
      targetUserIds = params.userIds;
    } else {
      throw new Error('必须提供 userIds 或设置 sendAll=true');
    }

    let sent = 0;
    let failed = 0;

    for (const uid of targetUserIds) {
      try {
        await this.sendMessage({
          userId: uid,
          type: params.type,
          title: params.title,
          content: params.content,
          channel: params.channel || 'in_app',
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * 发送微信小程序订阅消息
   * 注意：此功能依赖微信 API 配置和用户授权
   */
  private async sendWechatSubscribeMessage(message: MessageLog): Promise<void> {
    try {
      // TODO: 集成微信 subscribeMessage.send API
      // 步骤：
      // 1. 获取用户 openid（从 user 表或 Redis）
      // 2. 组装模板数据
      // 3. 调用微信 API 发送
      // 4. 更新 send_status

      // 占位实现 — 实际接入时替换为微信 SDK 调用
      this.logger.debug(`[订阅消息] 待发送: messageId=${message.id}, userId=${message.userId}`);

      // 标记为成功（实际应根据微信返回结果更新）
      await this.messageRepo.update(message.id, {
        sendStatus: 'success',
        sentAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`发送订阅消息失败: ${err.message}`);
      await this.messageRepo.update(message.id, {
        sendStatus: 'failed',
        failReason: err.message.slice(0, 255),
      });
    }
  }

  // ========== 订单状态变更通知模板 ==========

  /** 下单成功通知 */
  async notifyOrderCreated(userId: number, orderId: number, orderNo: string): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'order_status',
      title: '下单成功',
      content: `您的订单 ${orderNo} 已创建成功，请尽快前往门店取车。`,
      channel: 'push',
      bizId: orderId,
      templateId: process.env.WECHAT_TEMPLATE_ORDER_CREATED || '',
    });
  }

  /** 支付成功通知 */
  async notifyOrderPaid(userId: number, orderId: number, amount: number): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'order_status',
      title: '支付成功',
      content: `订单已支付 ¥${(amount / 100).toFixed(2)}，祝您骑行愉快！`,
      channel: 'push',
      bizId: orderId,
      templateId: process.env.WECHAT_TEMPLATE_ORDER_PAID || '',
    });
  }

  /** 取车成功通知 */
  async notifyPickupSuccess(userId: number, orderId: number): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'order_status',
      title: '取车成功',
      content: '您已成功取车，请注意安全骑行。还车后系统将自动结算费用。',
      channel: 'push',
      bizId: orderId,
    });
  }

  /** 还车成功通知 */
  async notifyReturnSuccess(userId: number, orderId: number, totalFee: number): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'order_status',
      title: '还车成功',
      content: `还车成功，本次骑行费用 ¥${(totalFee / 100).toFixed(2)}。感谢使用光阳电助力自行车！`,
      channel: 'push',
      bizId: orderId,
    });
  }

  /** 订单取消通知 */
  async notifyOrderCancelled(userId: number, orderId: number, reason: string): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'order_status',
      title: '订单已取消',
      content: `订单已取消${reason ? `，原因：${reason}` : ''}。如有疑问请联系客服。`,
      channel: 'in_app',
      bizId: orderId,
    });
  }

  // ========== 优惠券通知模板 ==========

  /** 优惠券到账通知 */
  async notifyCouponReceived(userId: number, couponName: string): Promise<void> {
    await this.sendMessage({
      userId,
      type: 'coupon',
      title: '优惠券到账',
      content: `恭喜您获得【${couponName}】，快去使用吧！`,
      channel: 'push',
    });
  }

  // ========== 管理端：消息管理 ==========

  /** 获取最近的消息日志（管理员查看） */
  async adminList(query: {
    page?: number;
    pageSize?: number;
    userId?: number;
    type?: MessageType;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 50);

    const qb = this.messageRepo.createQueryBuilder('msg')
      .orderBy('msg.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    if (query.userId) {
      qb.andWhere('msg.user_id = :userId', { userId: query.userId });
    }
    if (query.type) {
      qb.andWhere('msg.message_type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('msg.send_status = :status', { status: query.status });
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('msg.created_at BETWEEN :start AND :end', {
        start: query.startDate,
        end: query.endDate,
      });
    }

    const [list, total] = await qb.getManyAndCount();

    return {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
