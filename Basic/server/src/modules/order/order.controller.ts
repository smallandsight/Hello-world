import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  ReturnVehicleDto,
} from './dto/order.dto';

@ApiTags('订单模块')
@ApiBearerAuth('access-token')
@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 创建租车订单
   * 用户选择车辆、时间段后发起下单
   */
  @Post()
  @ApiOperation({ summary: '创建租车订单', description: '选择车辆和租用时段后提交订单' })
  async createOrder(
    @CurrentUser() payload: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(Number(payload.sub), dto);
  }

  /**
   * 获取我的订单列表
   * 支持分页 + 状态筛选
   */
  @Get('list')
  @ApiOperation({ summary: '获取订单列表', description: '支持按状态筛选，默认返回全部' })
  async getOrderList(
    @CurrentUser() payload: any,
    @Query() query: any,
  ) {
    return this.orderService.getOrderList(Number(payload.sub), query);
  }

  /**
   * 订单详情（含完整费用明细、支付记录）
   */
  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  async getOrderDetail(
    @Param('id') id: string,
    @CurrentUser() payload: any,
  ) {
    return this.orderService.getOrderDetail(Number(id), Number(payload.sub));
  }

  /**
   * 取消订单
   * 仅待支付/待取车状态可取消
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() payload: any,
    @Body() body?: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(
      Number(id),
      Number(payload.sub),
      body?.reason,
    );
  }

  /**
   * 确认取车（扫码/手动确认）
   */
  @Post(':id/pickup')
  @ApiOperation({ summary: '确认取车' })
  async pickupVehicle(
    @Param('id') id: string,
    @CurrentUser() payload: any,
  ) {
    return this.orderService.pickupVehicle(Number(id), Number(payload.sub));
  }

  /**
   * 发起还车
   */
  @Post(':id/return')
  @ApiOperation({ summary: '发起还车' })
  async returnVehicle(
    @Param('id') id: string,
    @CurrentUser() payload: any,
    @Body() body?: ReturnVehicleDto,
  ) {
    return this.orderService.returnVehicle(
      Number(id),
      Number(payload.sub),
      body,
    );
  }

  /**
   * 预览结算价格（还车前调用）
   */
  @Get(':id/settle/preview')
  @ApiOperation({ summary: '预览结算价格' })
  async previewSettlement(
    @Param('id') id: string,
    @CurrentUser() payload: any,
  ) {
    return this.orderService.previewSettlement(Number(id), Number(payload.sub));
  }
}
