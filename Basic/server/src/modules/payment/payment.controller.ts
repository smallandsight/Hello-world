import { Controller, Get, Post, UseGuards, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('支付模块')
@ApiBearerAuth('access-token')
@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('pay')
  @ApiOperation({ summary: '创建支付（支付宝/余额等）' })
  async createPayment(@Body() dto: any) {
    return this.paymentService.createPayment(dto);
  }

  @Get(':orderId/status')
  @ApiOperation({ summary: '查询订单支付状态' })
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(Number(orderId));
  }

  @Post(':orderId/refund')
  @ApiOperation({ summary: '申请退款' })
  async requestRefund(
    @Param('orderId') orderId: string,
    @Body() body?: { reason?: string },
  ) {
    return this.paymentService.requestRefund(Number(orderId), body?.reason);
  }
}
