import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { Activity, ActivityType, ActivityStatus } from './entities/activity.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('营销活动')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // ==================== 用户端接口 ====================

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户端活动列表' })
  async getUserActivities(@CurrentUser() userId: string) {
    return this.activityService.getActiveActivities(userId);
  }

  @Get('detail/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取活动详情' })
  async getActivityDetail(@Param('id') id: string) {
    return this.activityService.getActivityDetail(id);
  }

  @Get('flash-sale/:activityId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取限时特价商品列表' })
  async getFlashSales(@Param('activityId') activityId: string) {
    return this.activityService.getFlashSales(activityId);
  }

  @Get('discount-rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取可用满减规则' })
  async getDiscountRules() {
    return this.activityService.getDiscountRules({ status: true });
  }

  // ==================== 邀请有礼 ====================

  @Get('invite/code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的邀请码' })
  async getMyInviteCode(@CurrentUser() userId: string) {
    const code = await this.activityService.generateInviteCode(userId);
    return { code };
  }

  @Get('invite/records')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的邀请记录' })
  async getMyInvitations(@CurrentUser() userId: string) {
    return this.activityService.getUserInvitations(userId);
  }

  @Post('invite/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定邀请码' })
  async bindInviteCode(
    @CurrentUser() userId: string,
    @Body('code') code: string,
  ) {
    return this.activityService.bindInvitation(code, userId);
  }

  // ==================== 管理端接口 ====================

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取活动列表（管理端）' })
  @ApiQuery({ name: 'type', required: false, enum: ActivityType })
  @ApiQuery({ name: 'status', required: false, enum: ActivityStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getActivities(
    @Query('type') type?: ActivityType,
    @Query('status') status?: ActivityStatus,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.activityService.getActivities({ type, status, page, pageSize });
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建活动' })
  async createActivity(@Body() data: Partial<Activity>) {
    return this.activityService.createActivity(data);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新活动' })
  async updateActivity(
    @Param('id') id: string,
    @Body() data: Partial<Activity>,
  ) {
    return this.activityService.updateActivity(id, data);
  }

  @Post('admin/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '上架活动' })
  async activateActivity(@Param('id') id: string) {
    return this.activityService.activateActivity(id);
  }

  @Post('admin/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '下架活动' })
  async deactivateActivity(@Param('id') id: string) {
    return this.activityService.deactivateActivity(id);
  }

  // ==================== 限时特价管理 ====================

  @Post('admin/flash-sale')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建限时特价配置' })
  async createFlashSale(@Body() data: any) {
    return this.activityService.createFlashSale(data);
  }

  // ==================== 满减规则管理 ====================

  @Post('admin/discount-rule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建满减规则' })
  async createDiscountRule(@Body() data: any) {
    return this.activityService.createDiscountRule(data);
  }

  @Get('admin/discount-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取满减规则列表（管理端）' })
  async getAllDiscountRules() {
    return this.activityService.getDiscountRules();
  }

  // ==================== 活动效果分析 ====================

  @Get('admin/:id/effect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取活动效果统计' })
  async getActivityEffect(@Param('id') id: string) {
    return this.activityService.getActivityEffect(id);
  }
}