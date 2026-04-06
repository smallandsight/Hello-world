import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { InvoiceService } from './invoice.service';
import {
  CreateTitleDto,
  UpdateTitleDto,
  ApplyInvoiceDto,
} from './dto/invoice.dto';

/**
 * 发票管理 (T3W10-2)
 *
 * 路由前缀: /api/invoices
 */
@ApiTags('发票管理')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly service: InvoiceService) {}

  // ==================== 用户端：抬头管理 ====================

  @Get('titles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的发票抬头列表' })
  async getTitles() {
    // TODO: 从JWT获取userId
    return this.service.getTitleList(0);
  }

  @Post('titles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建发票抬头' })
  async createTitle(@Body() dto: CreateTitleDto) {
    // TODO: 从JWT获取userId
    return this.service.createTitle(0, dto);
  }

  @Put('titles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新发票抬头' })
  async updateTitle(
    @Param('id') id: string,
    @Body() dto: UpdateTitleDto,
  ) {
    return this.service.updateTitle(Number(id), 0, dto);
  }

  @Delete('titles/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除发票抬头' })
  async deleteTitle(@Param('id') id: string) {
    await this.service.deleteTitle(Number(id), 0);
    return { message: '删除成功' };
  }

  // ==================== 用户端：发票申请 ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '申请开票' })
  async applyInvoice(@Body() dto: ApplyInvoiceDto) {
    return this.service.applyInvoice(0, dto); // TODO: userId from JWT
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的发票列表' })
  async getMyInvoices(@Query() query?: { page?: number; size?: number }) {
    return this.service.getInvoiceList(0, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发票详情' })
  async getInvoiceDetail(@Param('id') id: string) {
    return this.service.getInvoiceDetail(Number(id), 0);
  }

  // ==================== 商家端操作 ====================

  @Put(':id/issue')
  @Roles('admin', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '开具发票（商家）' })
  async issue(@Param('id') id: string) {
    return this.service.issueInvoice(Number(id));
  }

  @Put(':id/deliver')
  @Roles('admin', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '标记已送达（商家）' })
  async deliver(@Param('id') id: string) {
    return this.service.markDelivered(Number(id));
  }

  @Get('merchant/list')
  @Roles('admin', 'manager', 'finance')
  @ApiBearerAuth()
  @ApiOperation({ summary: '全部发票列表(商家端)' })
  async getMerchantList(@Query() query?: { page?: number; size?: number; status?: string }) {
    return this.service.getMerchantInvoiceList(query);
  }
}
