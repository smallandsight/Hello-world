import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { WalletService } from './wallet.service';
import { RechargeDto } from './dto/wallet.dto';

/**
 * 钱包管理 (T3W10-4)
 *
 * 路由前缀: /api/wallet
 */
@ApiTags('钱包')
@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  /** 查询余额 */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '查询我的钱包余额' })
  async getBalance() {
    // TODO: 从JWT获取userId
    return this.service.getBalance(0);
  }

  /** 交易流水 */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '交易流水列表' })
  async getTransactions(@Query() query?: any) {
    return this.service.getTransactions(0, query);
  }

  /** 充值 */
  @Post('recharge')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发起充值' })
  async recharge(@Body() dto: RechargeDto) {
    return this.service.recharge(0, dto);
  }

  /** 统计（商家端）*/
  @Get('stats')
  @Roles('admin', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '钱包统计概览(商家端)' })
  async getStats() {
    return this.service.getWalletStats();
  }
}
