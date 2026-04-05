import { Controller, Get, Put, UseGuards, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageService } from './message.service';

@ApiTags('消息推送')
@ApiBearerAuth('access-token')
@Controller('message')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('list')
  @ApiOperation({ summary: '消息列表（分页）' })
  async getMessageList(
    @CurrentUser() payload: any,
    @Query() query: any,
  ) {
    return this.messageService.getMessageList(
      Number(payload.sub),
      query,
    );
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记消息已读' })
  async markAsRead(@Param('id') id: string) {
    return this.messageService.markAsRead(Number(id));
  }

  @Get('unread/count')
  @ApiOperation({ summary: '未读消息数量' })
  async getUnreadCount(@CurrentUser() payload: any) {
    return this.messageService.getUnreadCount(Number(payload.sub));
  }
}
