import {
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PointsService } from './points.service';
import { PointsRecordQueryDto } from './points.dto';

@ApiTags('营销模块-积分')
@ApiBearerAuth('access-token')
@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: '获取积分余额', description: '返回当前用户可用积分数' })
  async getBalance(@CurrentUser() payload: any) {
    const balance = await this.pointsService.getBalance(Number(payload.sub));
    return { balance };
  }

  @Get('records')
  @ApiOperation({ summary: '积分变动记录', description: '分页查询积分收支流水' })
  async getRecords(
    @CurrentUser() payload: any,
    @Query() query: PointsRecordQueryDto,
  ) {
    return this.pointsService.getRecords(Number(payload.sub), query);
  }

  @Post('sign-in')
  @ApiOperation({ summary: '每日签到', description: '签到获得5积分，每日限1次' })
  async signIn(@CurrentUser() payload: any) {
    return this.pointsService.signIn(Number(payload.sub));
  }

  @Get('sign-in/status')
  @ApiOperation({ summary: '检查今日签到状态' })
  async checkTodaySigned(@CurrentUser() payload: any) {
    const signed = await this.pointsService.checkTodaySigned(Number(payload.sub));
    return { todaySigned: signed };
  }
}
