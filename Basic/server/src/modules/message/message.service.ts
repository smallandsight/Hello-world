import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageService {
  async getMessageList(userId: number, query: any): Promise<any> {
    return { message: '待实现：消息列表', userId };
  }

  async markAsRead(messageId: number): Promise<any> {
    return { message: '待实现：标记已读', messageId };
  }

  async getUnreadCount(userId: number): Promise<any> {
    return { message: '待实现：未读数', userId };
  }
}
