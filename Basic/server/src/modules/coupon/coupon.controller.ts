import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CouponService } from './coupon.service';
import {
  ClaimCouponDto,
  UseCouponDto,
  CouponListQueryDto,
} from './dto/coupon.dto';

@ApiTags('营销模块-优惠券')
@ApiBearerAuth('access-token')
@Controller('coupon')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ========== 用户端接口 ==========

  @Get('my')
  @ApiOperation({ summary: '我的优惠券', description: '支持状态筛选: available/used/expired' })
  async getMyCoupons(
    @CurrentUser() payload: any,
    @Query() query: CouponListQueryDto,
  ) {
    return this.couponService.getUserCoupons(
      Number(payload.sub),
      query.status,
      { page: 1, size: 20 },
    );
  }

  @Get('my/list')
  @ApiOperation({ summary: '我的优惠券列表（分页）', description: '支持状态筛选' })
  async getMyCouponsPaginated(
    @CurrentUser() payload: any,
    @Query() query: CouponListQueryDto & { page?: string; size?: string },
  ) {
    return this.couponService.getUserCoupons(
      Number(payload.sub),
      query.status,
      { page: Number(query.page) || 1, size: Number(query.size) || 20 },
    );
  }

  @Get('available')
  @ApiOperation({
    summary: '获取可用优惠券推荐',
    description: '传入订单金额、车型ID等参数，返回满足使用条件的可用券（按优惠力度排序）',
  })
  async getAvailableCoupons(
    @CurrentUser() payload: any,
    @Query('amount') amount: string,       // 订单金额（元）
    @Query('vehicleId') vehicleId?: string, // 车型ID
    @Query('storeId') storeId?: string,     // 门店ID
  ) {
    return this.couponService.getAvailableCoupons(
      Number(payload.sub),
      Math.round(Number(amount) * 100), // 元→分
      vehicleId ? Number(vehicleId) : undefined,
      storeId ? Number(storeId) : undefined,
    );
  }

  @Post('claim/:templateId')
  @ApiParam({ name: 'templateId', description: '优惠券模板ID', example: 1 })
  @ApiOperation({ summary: '领取优惠券', description: '用户领取一张可领的优惠券到账户' })
  async claimCoupon(
    @CurrentUser() payload: any,
    @Param('templateId') templateId: string,
    @Body() dto: ClaimCouponDto,
  ) {
    return this.couponService.claimCoupon(
      Number(payload.sub),
      Number(templateId),
      dto.channel,
    );
  }

  @Post('use')
  @ApiOperation({ summary: '核销优惠券', description: '在订单中使用优惠券抵扣' })
  async useCoupon(
    @CurrentUser() payload: any,
    @Body() dto: UseCouponDto & { orderAmountCents?: number },
  ) {
    return this.couponService.useCoupon(
      Number(payload.sub),
      dto.userCouponId,
      dto.orderId,
      dto.orderAmountCents || 0,
    );
  }

  // ========== 积分相关 ==========

  @Get('points/balance')
  @ApiOperation({ summary: '获取积分余额和明细', deprecated: true })
  async getPointsBalance(@CurrentUser() payload: any) {
    return this.couponService.getPointsInfo(Number(payload.sub));
  }

  @Get('points/history')
  @ApiOperation({ summary: '积分变动历史', deprecated: true })
  async getPointsHistory(
    @CurrentUser() payload: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.couponService.getPointsHistory(
      Number(payload.sub),
      Number(page) || 1,
      Math.min(Number(pageSize) || 20, 50),
    );
  }

  // ========== 管理端接口（优惠券管理）==========

  @Get('admin/list')
  @ApiOperation({ summary: '[管理] 优惠券模板列表' })
  async adminListCoupons(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.couponService.adminList({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 20, 50),
      status: status as any,
    });
  }

  @Get('admin/:id')
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiOperation({ summary: '[管理] 优惠券详情' })
  async adminGetCoupon(@Param('id') id: string) {
    return this.couponService.adminGetDetail(Number(id));
  }

  @Post('admin/create')
  @ApiOperation({ summary: '[管理] 创建优惠券模板' })
  async adminCreateCoupon(@Body() body: any) {
    return this.couponService.adminCreate(body);
  }

  @Post('admin/:id/toggle')
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiOperation({ summary: '[管理] 启用/停用优惠券' })
  async adminToggleCoupon(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.couponService.adminToggleStatus(Number(id), body.enabled);
  }
}
