import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketService } from './ticket.service';

@ApiTags('客服工单')
@ApiBearerAuth('access-token')
@Controller('ticket')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @ApiOperation({ summary: '提交工单' })
  async createTicket(@CurrentUser() payload: any, @Body() dto: any) {
    return this.ticketService.createTicket(Number(payload.sub), dto);
  }

  @Get('list')
  @ApiOperation({ summary: '我的工单列表' })
  async getMyTickets(@CurrentUser() payload: any, @Query() query: any) {
    return this.ticketService.getTicketList(Number(payload.sub), query);
  }

  @Get(':id')
  @ApiOperation({ summary: '工单详情（含回复记录）' })
  async getTicketDetail(@Param('id') id: string) {
    return this.ticketService.getTicketDetail(Number(id));
  }

  @Post(':id/reply')
  @ApiOperation({ summary: '回复工单' })
  async replyTicket(
    @Param('id') id: string,
    @CurrentUser() payload: any,
    @Body() dto: { content: string },
  ) {
    return this.ticketService.replyToTicket(
      Number(id),
      Number(payload.sub),
      dto.content,
    );
  }
}
