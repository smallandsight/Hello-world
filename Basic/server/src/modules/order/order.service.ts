import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderLog } from './entities/order-log.entity';
import {
  OrderStatus,
  canTransition,
  ORDER_STATUS_LABELS,
} from '../../shared/types/order.types';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderLog)
    private readonly logRepo: Repository<OrderLog>,
  ) {}

  /**
   * 创建订单
   */
  async createOrder(userId: number, dto: any): Promise<Order> {
    // TODO: 校验车辆可用性、创建订单、记录日志
    return this.orderRepo.create({
      userId,
      status: OrderStatus.PENDING_PAYMENT,
      // ... 其他字段从 dto 填充
    }) as any;
  }

  /**
   * 获取用户订单列表（分页）
   */
  async getOrderList(
    userId: number,
    query: { page?: number; size?: number; status?: number },
  ) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .where('order.user_id = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    const [list, total] = await qb
      .skip(((query.page || 1) - 1) * (query.size || 20))
      .take(query.size || 20)
      .getManyAndCount();

    return { list, total };
  }

  /**
   * 订单详情
   */
  async getOrderDetail(orderId: number): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'vehicle', 'store'],
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  /**
   * 取消订单（状态机校验：仅待支付/待取车可取消）
   */
  async cancelOrder(
    orderId: number,
    userId: number,
    reason?: string,
  ) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('订单不存在');
    if (!canTransition(order.status, OrderStatus.CANCELLED)) {
      return { code: 4002, message: '当前状态无法取消' };
    }
    // TODO: 更新状态 + 写日志
    await this.orderRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason,
    });
    return { message: '取消成功', orderId };
  }

  /** 确认取车 */
  async pickupVehicle(orderId: number): Promise<any> {
    // TODO: 状态机校验 → 更新为 IN_USE → 写日志
    return { message: '待实现：取车确认', orderId };
  }

  /** 发起还车 */
  async returnVehicle(orderId: number, body?: any): Promise<any> {
    // TODO: 状态机校验 → 更新为 RETURN_PENDING → 写日志
    return { message: '待实现：发起还车', orderId, body };
  }

  /** 预览结算价格 */
  async previewSettlement(orderId: number): Promise<any> {
    // TODO: 调用 PricingService 计算
    return { message: '待实现：价格预览', orderId };
  }
}
