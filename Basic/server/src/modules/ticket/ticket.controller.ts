import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/permissions.decorator';
import { StaffAuthGuard } from '../../common/guards/staff-auth.guard';
import { TicketService } from './ticket.service';
import { CreateTicketDto, QueryTicketDto } from './dto/ticket.dto';

@ApiTags('客服工单')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ==================== 用户端接口 ====================

  /** 创建工单 */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户提交工单' })
  async create(@Body() payload: any, @Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(payload.sub, dto);
  }

  /** 我的工单列表 */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的工单列表' })
  async myList(@Body() payload: any, @Query() query: QueryTicketDto) {
    return this.ticketService.getUserTickets(payload.sub, query);
  }

  /** 工单详情（含回复）*/
  @Get(':id')
  @Public()
  @ApiOperation({ summary: '工单详情+回复记录' })
  async getDetail(@Param('id') id: string, @Query() query: any) {
    return this.ticketService.getTicketDetail(Number(id), query.userId);
  }

  /** 用户追加回复 */
  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户追加回复' })
  async userReply(@Param('id') id: string, @Body() payload: any, @Body() body: { content: string; images?: string[] }) {
    return this.ticketService.addReply(Number(id), payload.sub, body.content, body.images);
  }

  // ==================== 商家端接口 ====================

  /** 商家端工单列表 */
  @Get('admin/list')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '商家工单全量列表' })
  async adminList(@Query() query: QueryTicketDto) {
    return this.ticketService.listAllTickets(query);
  }

  /** 分派员工 */
  @Put(':id/assign')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '分派处理人' })
  async assign(@Param('id') id: string, @Body() body: { staffId: number }) {
    return this.ticketService.assignStaff(Number(id), body.staffId);
  }

  /** 状态变更 */
  @Put(':id/status')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '变更工单状态' })
  async changeStatus(
    @Param('id') id: string,
    @Body() body: { status: number; remark?: string },
  ) {
    return this.ticketService.changeStatus(Number(id), body.status, 'staff', undefined, body.remark);
  }

  /** 商家回复 */
  @Post(':id/staff-reply')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '商家正式回复' })
  async staffReply(@Param('id') id: string, @Body() body: { staffId: number; content: string; images?: string[] }) {
    return this.ticketService.staffReply(Number(id), body.staffId, body.content, body.images);
  }

  /** 关闭工单 */
  @Put(':id/close')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '关闭工单' })
  async close(@Param('id') id: string, @Body() body: { staffId: number; reason?: string }) {
    return this.ticketService.closeTicket(Number(id), body.staffId, body.reason);
  }

  // ==================== 统计 ====================

  @Get('stats/overview')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('staff-token')
  @ApiOperation({ summary: '工单统计概览' })
  async stats(@Query() query: { startDate?: string; endDate?: string }) {
    return this.ticketService.getStats(query.startDate, query.endDate);
  }
}
