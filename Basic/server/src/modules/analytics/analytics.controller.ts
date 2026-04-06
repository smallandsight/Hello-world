import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { EtlService } from './etl.service';
import { AnalyticsCron } from './analytics.cron';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/permissions.decorator';

@ApiTags('数据分析')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly etlService: EtlService,
    private readonly analyticsCron: AnalyticsCron,
  ) {}

  // ==================== Dashboard ====================

  @Get('dashboard')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取Dashboard概览数据' })
  async getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('real-time')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取实时统计数据' })
  async getRealTimeStats() {
    return this.analyticsService.getRealTimeStats();
  }

  // ==================== 用户分析 ====================

  @Get('users/rfm/:userId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '计算用户RFM值' })
  async calculateUserRFM(@Param('userId') userId: string) {
    return this.analyticsService.calculateRFM(userId);
  }

  @Get('users/segments')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取用户分群统计' })
  async getUserSegments() {
    return this.analyticsService.getUserSegments();
  }

  @Get('users/rfm-distribution')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取RFM分布统计' })
  async getRFMDistribution() {
    return this.analyticsService.getRFMDistribution();
  }

  // ==================== 订单分析 ====================

  @Get('orders/trend')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取订单趋势' })
  @ApiQuery({ name: 'startDate', required: true, description: '开始日期 YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, description: '结束日期 YYYY-MM-DD' })
  @ApiQuery({ name: 'granularity', required: false, enum: ['day', 'week', 'month'], description: '粒度' })
  async getOrderTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getOrderTrend(startDate, endDate, granularity);
  }

  @Get('orders/conversion')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取下单转化率' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getConversionRate(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getConversionRate(startDate, endDate);
  }

  @Get('orders/peak-hours')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取高峰时段分析' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getPeakHours(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getPeakHours(startDate, endDate);
  }

  @Get('orders/average-value')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取客单价分析' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getAverageOrderValue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getAverageOrderValue(startDate, endDate);
  }

  // ==================== 车辆分析 ====================

  @Get('vehicles/utilization')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取车辆利用率分析' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getUtilizationRate(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getUtilizationRate(startDate, endDate);
  }

  @Get('vehicles/popular-models')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取热门车型' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async getPopularModels(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analyticsService.getPopularModels(startDate, endDate, limit || 10);
  }

  // ==================== 收入分析 ====================

  @Get('revenue/trend')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取收入趋势' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: ['day', 'week', 'month'] })
  async getRevenueTrend(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getRevenueTrend(startDate, endDate, granularity);
  }

  @Get('revenue/by-category')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '获取收入分类统计' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getRevenueByCategory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getRevenueByCategory(startDate, endDate);
  }

  // ==================== 异常检测 ====================

  @Get('exceptions')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '检查异常订单' })
  async checkExceptions() {
    return this.analyticsService.checkOrderExceptions();
  }

  // ==================== 聚合数据查询 ====================

  @Get('daily')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '查询日聚合数据' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getDailyData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { Between } = await import('typeorm');
    const data = await this.analyticsService['dailyRepo'].find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });
    return data;
  }

  @Get('weekly')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '查询周聚合数据' })
  @ApiQuery({ name: 'year', required: false })
  async getWeeklyData(@Query('year', new ParseIntPipe({ optional: true })) year?: number) {
    const targetYear = year || new Date().getFullYear();
    const data = await this.analyticsService['weeklyRepo'].find({
      where: { year: targetYear },
      order: { week: 'ASC' },
    });
    return data;
  }

  @Get('monthly')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '查询月聚合数据' })
  @ApiQuery({ name: 'year', required: false })
  async getMonthlyData(@Query('year', new ParseIntPipe({ optional: true })) year?: number) {
    const targetYear = year || new Date().getFullYear();
    const data = await this.analyticsService['monthlyRepo'].find({
      where: { year: targetYear },
      order: { month: 'ASC' },
    });
    return data;
  }

  // ==================== 手动触发聚合（管理员）====================

  @Get('trigger/:type')
  @Roles('admin')
  @ApiOperation({ summary: '手动触发数据聚合（仅管理员）' })
  async triggerAggregation(@Param('type') type: 'daily' | 'weekly' | 'monthly') {
    return this.analyticsCron.triggerManualAggregation(type);
  }
}