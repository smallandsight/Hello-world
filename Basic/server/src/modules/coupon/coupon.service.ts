import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CouponService {
  // TODO: 注入 UserCoupon/PointsRecord/Coupon Repositories

  async getUserCoupons(userId: number): Promise<any> {
    return { message: '待实现：用户优惠券列表', userId };
  }

  async getAvailableForOrder(
    userId: number,
    orderId: number,
  ): Promise<any> {
    return { message: '待实现：订单可用优惠券', userId, orderId };
  }

  async getPointsInfo(userId: number): Promise<any> {
    return { message: '待实现：积分信息', userId };
  }
}
