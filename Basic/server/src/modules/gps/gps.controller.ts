/**
 * GPS 轨迹 HTTP 控制器
 * 提供 GPS 数据上报、实时位置查询、轨迹回放等 REST API
 */
import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { GpsTrackService, GpsPoint, GeoFence } from './gps-track.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffAuthGuard } from '../../common/guards/staff-auth.guard';

@Controller('gps')
export class GpsController {
  constructor(private readonly gpsService: GpsTrackService) {}

  /** GPS 单点上报 */
  @Post('report')
  @UseGuards(JwtAuthGuard)
  async reportLocation(@Body() point: GpsPoint) {
    return this.gpsService.reportGpsPoint(point);
  }

  /** GPS 批量上报 */
  @Post('report/batch')
  @UseGuards(JwtAuthGuard)
  async batchReport(@Body('points') points: GpsPoint[]) {
    return this.gpsService.batchReportGpsPoints(points);
  }

  /** 查询车辆实时位置 */
  @Get('live/:vehicleId')
  @UseGuards(JwtAuthGuard)
  async getLiveLocation(@Param('vehicleId') vehicleId: number) {
    return this.gpsService.getVehicleLiveLocation(vehicleId);
  }

  /** 批量查询多车实时位置 */
  @Get('live/batch')
  @UseGuards(JwtAuthGuard)
  async getLiveLocations(@Query('ids') ids: string) {
    const vehicleIds = ids.split(',').map(Number);
    const result = await this.gpsService.getVehiclesLiveLocations(vehicleIds);
    return Object.fromEntries(result);
  }

  /** 查询历史轨迹 */
  @Get('track/:vehicleId')
  @UseGuards(StaffAuthGuard)
  async getTrackHistory(
    @Param('vehicleId') vehicleId: number,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('orderId') orderId?: string,
    @Query('maxPoints') maxPoints?: string,
  ) {
    return this.gpsService.getTrackHistory({
      vehicleId,
      startTime: Number(start),
      endTime: Number(end),
      orderId: orderId ? Number(orderId) : undefined,
      maxPoints: maxPoints ? Number(maxPoints) : undefined,
    });
  }

  /** 查询轨迹段（行程统计） */
  @Get('segments/:vehicleId')
  @UseGuards(StaffAuthGuard)
  async getSegments(
    @Param('vehicleId') vehicleId: number,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.gpsService.getTrackSegments({
      vehicleId,
      page: page ? Number(page) : 1,
      size: size ? Number(size) : 20,
    });
  }

  /** 计算行程统计 */
  @Get('stats/:vehicleId')
  @UseGuards(StaffAuthGuard)
  async getTripStats(
    @Param('vehicleId') vehicleId: number,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.gpsService.calculateTripStats({
      vehicleId,
      startTime: Number(start),
      endTime: Number(end),
    });
  }

  /** 注册地理围栏 */
  @Post('fence')
  @UseGuards(StaffAuthGuard)
  async registerFence(@Body() fence: GeoFence) {
    this.gpsService.registerFence(fence);
    return { message: '围栏已注册', fenceId: fence.id };
  }
}
