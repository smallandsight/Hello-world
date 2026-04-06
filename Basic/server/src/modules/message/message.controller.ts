import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageService } from './message.service';

@ApiTags('消息推送')
@ApiBearerAuth('access-token')
@Controller('message')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // ========== 用户端接口 ==========

  @Get('list')
  @ApiOperation({ summary: '消息列表（分页）', description: '支持按 type 筛选: order_status/system/marketing/coupon' })
  async getMessageList(
    @CurrentUser() payload: any,
    @Query() query: any,
  ) {
    return this.messageService.getMessageList(Number(payload.sub), query);
  }

  @Get('summary')
  @ApiOperation({
    summary: '消息摘要',
    description: '返回未读数 + 最近3条消息，用于首页展示',
  })
  async getMessageSummary(@CurrentUser() payload: any) {
    return this.messageService.getMessageSummary(Number(payload.sub));
  }

  @Get('unread/count')
  @ApiOperation({ summary: '未读消息数量' })
  async getUnreadCount(@CurrentUser() payload: any) {
    return this.messageService.getUnreadCount(Number(payload.sub));
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记单条消息已读' })
  async markAsRead(@Param('id') id: string) {
    await this.messageService.markAsRead(Number(id));
    return { success: true };
  }

  @Put('all/read')
  @ApiOperation({ summary: '标记全部已读' })
  async markAllRead(@CurrentUser() payload: any) {
    const count = await this.messageService.markAllRead(Number(payload.sub));
    return { success: true, markedCount: count };
  }
}
