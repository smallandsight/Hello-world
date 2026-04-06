import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('反馈模块')
@ApiBearerAuth('access-token')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ========== 用户端接口 ==========

  @Post()
  @ApiOperation({ summary: '提交反馈', description: '功能建议、Bug报告、投诉等' })
  async createFeedback(
    @CurrentUser() payload: any,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.createFeedback(Number(payload.sub), dto);
  }

  @Get('my')
  @ApiOperation({ summary: '我的反馈列表', description: '分页查询我提交的所有反馈' })
  async getMyFeedbacks(
    @CurrentUser() payload: any,
    @Query() query?: { page?: string; size?: string; status?: string; category?: string },
  ) {
    return this.feedbackService.getMyFeedbacks(Number(payload.sub), {
      page: Number(query?.page) || 1,
      size: Math.min(Number(query?.size) || 20, 50),
      status: query?.status as any,
      category: query?.category as any,
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: '反馈ID', example: 1 })
  @ApiOperation({ summary: '反馈详情' })
  async getDetail(@Param('id') id: string) {
    return this.feedbackService.getDetail(Number(id));
  }
}
