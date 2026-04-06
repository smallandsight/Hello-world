import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { ViolationService } from './violation.service';
import { FreezeViolationDepositDto, DeductViolationDto, RefundViolationDto, QueryViolationDto } from './dto/violation.dto';

/**
 * 违章押金管理 (T3W10-1)
 *
 * 路由前缀: /api/violations
 */
@ApiTags('违章押金')
@Controller('violations')
@UseGuards(JwtAuthGuard)
export class ViolationController {
  constructor(private readonly service: ViolationService) {}

  /** 冻结违章押金（还车时调用，可由系统内部或订单服务触发）*/
  @Post(':orderId/freeze')
  @ApiOperation({ summary: '冻结违章押金' })
  async freeze(
    @Param('orderId') orderId: string,
    @Body() dto: FreezeViolationDepositDto,
  ) {
    dto.orderId = Number(orderId);
    return this.service.freezeDeposit(dto);
  }

  /** 查询某订单的违章押金记录 */
  @Get('orders/:orderId')
  @ApiOperation({ summary: '查询订单的违章押金' })
  async getByOrder(@Param('orderId') orderId: string) {
    const record = await this.service.getByOrderId(Number(orderId));
    if (!record) throw new Error('未找到该订单的违章押金记录');
    return record;
  }

  /** 扣除违章押金 */
  @Post(':id/deduct')
  @Roles('admin', 'manager', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '扣除违章押金（商家操作）' })
  async deduct(@Param('id') id: string, @Body() dto: DeductViolationDto) {
    return this.service.deduct(Number(id), dto, 0); // TODO: 从JWT获取operatorId
  }

  /** 退还违章押金 */
  @Post(':id/refund')
  @Roles('admin', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '退还违章押金' })
  async refund(@Param('id') id: string, @Body() dto?: RefundViolationDto) {
    return this.service.refund(Number(id), dto);
  }

  /** 商家端列表查询 */
  @Get()
  @Roles('admin', 'manager', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '违章押金列表(商家端)' })
  async getList(@Query() query: QueryViolationDto) {
    return this.service.getList(query);
  }

  /** 统计概览 */
  @Get('stats/overview')
  @Roles('admin', 'manager', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '违章押金统计' })
  async getStats() {
    return this.service.getStats();
  }
}
