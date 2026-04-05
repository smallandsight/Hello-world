import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async createPayment(dto: any): Promise<any> {
    return { message: '待实现：创建支付记录', dto };
  }

  async getPaymentStatus(orderId: number): Promise<any> {
    const payment = await this.paymentRepo.findOne({ where: { orderId } });
    return payment || null;
  }

  async requestRefund(orderId: number, reason?: string): Promise<any> {
    return { message: '待实现：申请退款', orderId, reason };
  }
}
