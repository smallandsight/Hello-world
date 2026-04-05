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
import { PageQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('订单模块')
@ApiBearerAuth('access-token')
@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单（选择车辆后发起）' })
  async createOrder(
    @CurrentUser() payload: any,
    @Body() dto: any, // CreateOrderDto
  ) {
    return this.orderService.createOrder(Number(payload.sub), dto);
  }

  @Get('list')
  @ApiOperation({ summary: '获取我的订单列表' })
  async getOrderList(
    @CurrentUser() payload: any,
    @Query() query: PageQueryDto & { status?: number },
  ) {
    return this.orderService.getOrderList(Number(payload.sub), query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.getOrderDetail(Number(id));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() payload: any,
    @Body() body?: { reason?: string },
  ) {
    return this.orderService.cancelOrder(
      Number(id),
      Number(payload.sub),
      body?.reason,
    );
  }

  @Post(':id/pickup')
  @ApiOperation({ summary: '确认取车' })
  async pickupVehicle(@Param('id') id: string) {
    return this.orderService.pickupVehicle(Number(id));
  }

  @Post(':id/return')
  @ApiOperation({ summary: '发起还车' })
  async returnVehicle(
    @Param('id') id: string,
    @Body() body?: { lat?: number; lng?: number; locationDesc?: string },
  ) {
    return this.orderService.returnVehicle(Number(id), body);
  }

  @Post(':id/price/preview')
  @ApiOperation({ summary: '预览结算价格（还车时调用）' })
  async previewSettlement(@Param('id') id: string) {
    return this.orderService.previewSettlement(Number(id));
  }
}
