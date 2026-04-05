import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketService {
  async createTicket(userId: number, dto: any): Promise<any> {
    return { message: '待实现：创建工单', userId, dto };
  }

  async getTicketList(userId: number, query: any): Promise<any> {
    return { message: '待实现：工单列表', userId };
  }

  async getTicketDetail(ticketId: number): Promise<any> {
    return { message: '待实现：工单详情', ticketId };
  }

  async replyToTicket(
    ticketId: number,
    userId: number,
    content: string,
  ): Promise<any> {
    return { message: '待实现：回复工单', ticketId, content };
  }
}
