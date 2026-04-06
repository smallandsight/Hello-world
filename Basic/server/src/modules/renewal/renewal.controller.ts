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
import { RenewalService } from './renewal.service';
import { ApplyRenewalDto, ApproveRenewalDto } from './dto/renewal.dto';

/**
 * 续租管理 (T3W10-5)
 *
 * 路径前缀: /api/renewals
 */
@ApiTags('续租管理')
@Controller('renewals')
export class RenewalController {
  constructor(private readonly service: RenewalService) {}

  // ==================== 用户端 ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '申请续租' })
  async apply(@Body() dto: ApplyRenewalDto) {
    return this.service.apply(dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的续租记录' })
  async getMyRenewals(@Query() query?: any) {
    return this.service.getMyRenewals(0, query); // TODO: userId from JWT
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '支付续租费用' })
  async pay(@Param('id') id: string) {
    return this.service.pay(Number(id));
  }

  // ==================== 商家端 ====================

  @Put(':id/approve')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: '审批续租申请(商家)' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRenewalDto,
  ) {
    return this.service.approve(Number(id), 0, dto); // TODO: staffId from JWT
  }

  @Get()
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: '全部续租列表(商家端)' })
  async getMerchantList(@Query() query?: any) {
    return this.service.getMerchantList(query);
  }
}
