import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouponService } from './coupon.service';

@ApiTags('营销模块')
@ApiBearerAuth('access-token')
@Controller('coupon')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get('my/list')
  @ApiOperation({ summary: '我的优惠券列表' })
  async getMyCoupons(@CurrentUser() payload: any) {
    return this.couponService.getUserCoupons(Number(payload.sub));
  }

  @Get('available/:orderId')
  @ApiOperation({ summary: '获取订单可用的优惠券列表' })
  async getAvailableCoupons(
    @CurrentUser() payload: any,
    @Param('orderId') orderId: string,
  ) {
    return this.couponService.getAvailableForOrder(
      Number(payload.sub),
      Number(orderId),
    );
  }

  @Get('points/balance')
  @ApiOperation({ summary: '获取积分余额和明细' })
  async getPointsBalance(@CurrentUser() payload: any) {
    return this.couponService.getPointsInfo(Number(payload.sub));
  }
}
