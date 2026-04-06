/**
 * 在线客服 WebSocket Gateway
 * 
 * 功能：
 * 1. 用户连接/断线管理
 * 2. 实时消息收发（文本/图片/订单卡片）
 * 3. 客服上下线状态
 * 4. 消息已读回执
 * 5. 历史消息加载
 * 6. 自动分配客服（轮询/最少会话数策略）
 * 
 * 前端连接方式：
 *   const socket = io('/chat', {
 *     query: { token: 'jwt_token', userId: 'xxx' },
 *     transports: ['websocket'],
 *   });
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@typeorm';
import { Repository } from 'typeorm';

// ==================== 类型定义 ====================

/** 聊天参与者角色 */
export type ChatRole = 'user' | 'staff' | 'system' | 'bot';

/** 消息类型 */
export type MessageType = 'text' | 'image' | 'order_card' | 'system' | 'typing';

/** 消息结构 */
export interface ChatMessage {
  id?: string;
  conversationId: string;
  senderId: string;        // 发送者ID
  senderRole: ChatRole;
  receiverId?: string;     // 接收者ID（私聊场景）
  content: string;
  type: MessageType;
  metadata?: Record<string, any>; // 扩展数据（如图片URL、订单号）
  timestamp: number;
  readAt?: number;         // 已读时间
}

/** 会话信息 */
export interface ConversationInfo {
  id: string;
  userId: string;          // 用户ID
  staffId?: string;        // 分配的客服
  status: 'waiting' | 'active' | 'closed';
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  unreadCount?: number;
  userUnreadCount?: number;
  staffUnreadCount?: number;
  subject?: string;        // 会话主题（可选，如"关于订单 #xxx"）
}

/** 连接的用户信息 */
interface ConnectedClient {
  socketId: string;
  userId: string | null;   // 未认证时为null
  role: ChatRole;
  joinedRooms: Set<string>;
  connectedAt: number;
  lastPing: number;
}

// ==================== Gateway 实现 ====================

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,      // 25秒心跳间隔
  pingTimeout: 60000,       // 60超时
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** 已连接客户端映射 (socketId → client info) */
  private clients = new Map<string, ConnectedClient>();

  /** 用户到socketIds映射（一个用户可能多设备在线） */
  private userSockets = new Map<string, Set<string>>();

  /** 活跃会话列表 */
  private conversations = new Map<string, ConversationInfo>();

  /** 客服列表（在线的staff） */
  private onlineStaffs = new Set<string>();

  constructor(private readonly jwtService: JwtService) {}

  // ==================== 连接管理 ====================

  async handleConnection(client: Socket) {
    try {
      // 从query或handshake中获取token
      const token = client.handshake.query.token as string ||
                     client.handshake.auth?.token;

      let userId: string | null = null;
      let role: ChatRole = 'user';

      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          userId = String(payload.sub || payload.userId);
          role = payload.role === 'staff' ? 'staff' : 'user';
        } catch {
          // token无效，允许作为匿名访客连接
          this.logger.warn(`[Chat] 无效token，以匿名模式连接 socket=${client.id}`);
          role = 'user';
        }
      }

      // 记录连接
      const clientInfo: ConnectedClient = {
        socketId: client.id,
        userId,
        role,
        joinedRooms: new Set(),
        connectedAt: Date.now(),
        lastPing: Date.now(),
      };

      this.clients.set(client.id, clientInfo);

      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(client.id);

        // 如果是客服，标记上线
        if (role === 'staff') {
          this.onlineStaffs.add(userId);
          this.broadcastStaffList();
        }
      }

      // 发送欢迎消息和当前状态
      client.emit('connected', {
        socketId: client.id,
        userId,
        role,
        serverTime: Date.now(),
        onlineStaffCount: this.onlineStaffs.size,
      });

      this.logger.log(`[Chat] 连接建立 socket=${client.id} user=${userId} role=${role}`);
    } catch (error) {
      this.logger.error(`[Chat] 连接处理异常: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const info = this.clients.get(client.id);
    if (!info) return;

    // 清理用户映射
    if (info.userId && this.userSockets.has(info.userId)) {
      this.userSockets.get(info.userId)!.delete(client.id);
      if (this.userSockets.get(info.userId)!.size === 0) {
        this.userSockets.delete(info.userId);

        // 客服离线
        if (info.role === 'staff') {
          this.onlineStaffs.delete(info.userId);
          this.broadcastStaffList();
        }
      }
    }

    this.clients.delete(client.id);
    this.logger.log(`[Chat] 断开连接 socket=${client.id} user=${info.userId}`);
  }

  // ==================== 消息事件 ====================

  /**
   * 加入会话房间
   */
  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string; createIfMissing?: boolean; subject?: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    let convId = body.conversationId;

    // 创建新会话
    if (!convId && body.createIfMissing && info.userId) {
      convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const conversation: ConversationInfo = {
        id: convId,
        userId: info.userId,
        status: 'waiting',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messageCount: 0,
        subject: body.subject,
      };

      this.conversations.set(convId, conversation);
      this.logger.log(`[Chat] 新建会话 ${convId} user=${info.userId}`);

      // 尝试自动分配客服
      this.autoAssignStaff(convId);
    }

    if (!convId) {
      client.emit('error', { code: 'MISSING_CONV_ID', message: '缺少会话ID' });
      return;
    }

    // 加入房间
    client.join(convId);
    info.joinedRooms.add(convId);

    // 返回会话信息 + 最近N条历史消息
    const conv = this.conversations.get(convId);
    client.emit('joined:conversation', {
      conversationId: convId,
      conversation: conv || null,
      members: this.getRoomMembers(convId),
    });

    // 通知房间其他人
    client.to(convId).emit('user:joined', {
      conversationId: convId,
      userId: info.userId,
      role: info.role,
    });
  }

  /**
   * 发送消息（核心功能）
   */
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() msg: Partial<ChatMessage> & { conversationId: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    const fullMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      conversationId: msg.conversationId,
      senderId: info.userId || client.id,
      senderRole: info.role,
      content: msg.content?.trim().substring(0, 5000) || '', // 限制5000字
      type: msg.type || 'text',
      metadata: msg.metadata,
      timestamp: Date.now(),
    };

    // 内容安全检查（简单过滤，生产环境接入阿里云内容审核）
    if (!this.isContentSafe(fullMessage.content)) {
      client.emit('message:rejected', {
        messageId: fullMessage.id,
        reason: '消息内容包含敏感词汇',
      });
      return;
    }

    // 更新会话统计
    const conv = this.conversations.get(msg.conversationId);
    if (conv) {
      conv.lastMessageAt = Date.now();
      conv.messageCount++;
      if (conv.status === 'waiting') {
        conv.status = 'active';
      }
    }

    // 广播给会话中的所有人（除发送者外也发一份用于确认）
    this.server.to(msg.conversationId).emit('message:new', fullMessage);
    // 也发给发送者自己（用于UI确认发送成功）
    client.emit('message:sent', fullMessage);

    this.logger.debug(`[Chat] 消息 ${fullMessage.id} in ${msg.conversationId} from ${info.userId}`);

    // 如果是用户发的且没有客服响应，触发自动回复或机器人回复
    if (info.role === 'user' && !conv?.staffId) {
      this.handleAutoReply(fullMessage);
    }

    // TODO: 持久化消息到数据库（异步）
    // await this.chatService.saveMessage(fullMessage);
  }

  /**
   * 标记已读
   */
  @SubscribeMessage('read:receipt')
  async handleReadReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string; conversationId: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    // 广播已读确认
    client.to(body.conversationId).emit('message:read', {
      messageId: body.messageId,
      readBy: info.userId,
      readAt: Date.now(),
    });
  }

  /**
   * 输入中指示器
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    client.to(body.conversationId).emit('user:typing', {
      userId: this.clients.get(client.id)?.userId,
      isTyping: body.isTyping,
    });
  }

  /**
   * 关闭会话
   */
  @SubscribeMessage('close:conversation')
  async handleCloseConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; reason?: string },
  ) {
    const info = this.clients.get(client.id);
    if (!info) return;

    const conv = this.conversations.get(body.conversationId);
    if (conv) {
      conv.status = 'closed';
      client.leave(body.conversationId);
      info.joinedRooms.delete(body.conversationId);

      this.server.to(body.conversationId).emit('conversation:closed', {
        conversationId: body.conversationId,
        closedBy: info.userId,
        closedAt: Date.now(),
        reason: body.reason,
      });
    }
  }

  // ==================== 管理接口 ====================

  /** 获取所有活跃会话（供管理员面板使用） */
  @SubscribeMessage('admin:getConversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const info = this.clients.get(client.id);
    if (!info || info.role !== 'staff') {
      client.emit('error', { code: 'FORBIDDEN', message: '仅限客服操作' });
      return;
    }

    const list = Array.from(this.conversations.values())
      .filter(c => c.status !== 'closed')
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    client.emit('admin:conversations', { conversations: list });
  }

  /** 获取在线客服列表 */
  @SubscribeMessage('getOnlineStaffs')
  async handleGetOnlineStaffs(@ConnectedSocket() client: Socket) {
    client.emit('onlineStaffs', {
      count: this.onlineStaffs.size,
      staffIds: Array.from(this.onlineStaffs),
    });
  }

  // ==================== 内部方法 ====================

  /** 内容安全检查（简单版） */
  private isContentSafe(content: string): boolean {
    if (!content) return true;
    // 基础敏感词过滤（生产环境建议接入阿里云内容审核API）
    const blockedPatterns = /赌博|诈骗|色情|违禁|毒品|枪支/;
    return !blockedPatterns.test(content);
  }

  /** 自动分配客服（最少会话数策略） */
  private autoAssignStaff(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.staffId) return;

    // 找出当前会话最少的客服
    // 这里简化为随机分配，生产环境可按负载均衡算法选择
    const staffList = Array.from(this.onlineStaffs);
    if (staffList.length > 0) {
      const assignedStaffId = staffList[Math.floor(Math.random() * staffList.length)];
      conv.staffId = assignedStaffId;
      conv.status = 'active';

      // 通知客服有新会话
      this.server.to(this.getSocketsByUser(assignedStaffId)).emit('staff:assigned', {
        conversationId,
        conversation: conv,
      });

      // 通知用户已接通
      this.server.to(conversationId).emit('staff:connected', {
        conversationId,
        staffId: assignedStaffId,
      });

      this.logger.log(`[Chat] 自动分配客服 ${assignedStaffId} → 会话 ${conversationId}`);
    }
  }

  /** 自动回复（机器人/FAQ） */
  private handleAutoReply(message: ChatMessage): void {
    // 简单关键词匹配回复（生产环境可接入大模型智能客服）
    const autoReplies: Array<{ keywords: RegExp[]; reply: string }> = [
      { keywords: [/你好|您好|hi|hello/i], reply: '您好！我是古月租车智能客服小助手，请问有什么可以帮您？' },
      { keywords: [/价格|费用|多少钱/i], reply: '我们的租车价格根据车型和时长有所不同，最低仅需XX元/小时起。您可以进入小程序查看具体报价~' },
      { keywords: [/取车|还车|怎么租/i], reply: '租车流程很简单：\n1. 选择附近门店和车辆\n2. 下单并支付押金\n3. 到店扫码取车\n\n需要我帮您查询附近门店吗？' },
      { keywords: [/退款|取消|退钱/i], reply: '关于退款：\n• 取车前48h以上可全额退款\n• 24-48h退80%\n• 12-24h退50%\n• 12h内不可退款\n如有特殊情况请联系人工客服。' },
      { keywords: [/投诉|意见|反馈|不爽/i], reply: '非常抱歉给您带来不好的体验！请留下联系方式和具体情况，我们会尽快为您处理。也可以拨打客服热线：400-XXX-XXXX' },
    ];

    for (const rule of autoReplies) {
      if (rule.keywords.some(k => k.test(message.content))) {
        setTimeout(() => {
          this.server.to(message.conversationId).emit('message:new', {
            id: `bot_${Date.now()}`,
            conversationId: message.conversationId,
            senderId: 'bot',
            senderRole: 'bot',
            content: rule.reply,
            type: 'text',
            timestamp: Date.now(),
            metadata: { isAutoReply: true },
          });
        }, 500); // 500ms延迟模拟思考时间
        break;
      }
    }
  }

  /** 获取房间内成员 */
  private getRoomMembers(roomId: string): Array<{ userId: string | null; role: ChatRole }> {
    const room = this.server.sockets.adapter.rooms.get(roomId);
    if (!room) return [];

    const members: Array<{ userId: string | null; role: ChatRole }> = [];
    for (const socketId of room) {
      const info = this.clients.get(socketId);
      if (info) {
        members.push({ userId: info.userId, role: info.role });
      }
    }
    return members;
  }

  /** 通过用户ID获取其所有Socket ID */
  private getSocketsByUser(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /** 广播在线客服列表变化 */
  private broadcastStaffList(): void {
    this.server.emit('onlineStaffs:update', {
      count: this.onlineStaffs.size,
      staffIds: Array.from(this.onlineStaffs),
      timestamp: Date.now(),
    });
  }

  // ==================== 公共方法（供其他模块调用） ====================

  /** 向指定用户发送系统通知 */
  sendSystemNotification(userId: string, content: string, type: MessageType = 'system'): void {
    const sockets = this.getSocketsByUser(userId);
    for (const socketId of sockets) {
      this.server.to(socketId).emit('system:notification', {
        content,
        type,
        timestamp: Date.now(),
      });
    }
  }

  /** 向指定会话广播管理员消息 */
  broadcastToConversation(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    this.server.to(conversationId).emit('message:new', {
      ...message,
      id: `sys_${Date.now()}`,
      timestamp: Date.now(),
    });
  }

  /** 获取当前在线人数统计 */
  getConnectionStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    anonymousUsers: number;
    onlineStaffs: number;
    activeConversations: number;
  } {
    let authenticatedUsers = 0;
    let anonymousUsers = 0;

    for (const client of this.clients.values()) {
      if (client.userId) authenticatedUsers++;
      else anonymousUsers++;
    }

    return {
      totalConnections: this.clients.size,
      authenticatedUsers,
      anonymousUsers,
      onlineStaffs: this.onlineStaffs.size,
      activeConversations: Array.from(this.conversations.values()).filter(c => c.status !== 'closed').length,
    };
  }
}
