import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  RefundRequestDto,
} from './dto/payment.dto';

@ApiTags('支付模块')
@ApiBearerAuth('access-token')
@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 创建支付记录（生成支付流水号）
   * 前端调用后获取支付参数，再调起第三方支付
   */
  @Post('create')
  @ApiOperation({ summary: '创建支付', description: '创建支付流水号，返回支付记录' })
  async createPayment(
    @CurrentUser() payload: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(Number(payload.sub), dto);
  }

  /**
   * 获取调起支付的参数
   * 调用此接口后拿到 tradeNO 等参数，前端/小程序调起支付宝/微信
   */
  @Get('params')
  @ApiOperation({ summary: '获取支付参数', description: '返回调起第三方支付所需的参数' })
  async getPayParams(@Query('paymentId') paymentId: string) {
    return this.paymentService.getPayParams(Number(paymentId));
  }

  /**
   * 查询支付结果（主动轮询）
   */
  @Get(':paymentId/status')
  @ApiOperation({ summary: '查询支付状态' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.queryPaymentResult(Number(paymentId));
  }

  /**
   * 获取订单的支付状态汇总
   */
  @Get('order/:orderId/status')
  @ApiOperation({ summary: '订单支付状态', description: '获取某订单的所有支付记录和退款状态' })
  async getOrderPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getOrderPaymentStatus(Number(orderId));
  }

  /**
   * 发起退款申请
   */
  @Post(':orderId/refund')
  @ApiOperation({ summary: '申请退款' })
  async requestRefund(
    @Param('orderId') orderId: string,
    @CurrentUser() payload: any,
    @Body() body?: RefundRequestDto,
  ) {
    // 合并 orderId 到 DTO 中
    const dto = { ...(body || {}), orderId: Number(orderId) };
    return this.paymentService.requestRefund(Number(payload.sub), dto as any);
  }
}
