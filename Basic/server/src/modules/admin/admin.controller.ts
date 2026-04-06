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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../../common/guards/staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';

/**
 * 管理后台 API
 * 路由前缀：/api/admin
 * 认证：StaffAuthGuard（商家端 JWT） + RolesGuard（角色权限）
 */
@ApiTags('管理后台')
@ApiBearerAuth('staff-token')
@Controller('admin')
@UseGuards(StaffAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== 仪表盘 ====================

  @Get('dashboard/stats')
  @ApiOperation({ summary: '仪表盘数据统计' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ==================== 车辆管理 ====================

  @Get('vehicles')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '车辆列表（含筛选）' })
  async getVehicleList(@Query() query: any) {
    return this.adminService.getVehicleList(query);
  }

  @Get('vehicles/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '车辆详情' })
  async getVehicleDetail(@Param('id') id: string) {
    return this.adminService.getVehicleDetail(Number(id));
  }

  @Post('vehicles')
  @Roles('admin')
  @ApiOperation({ summary: '新增车辆' })
  async createVehicle(@Body() dto: any) {
    return this.adminService.createVehicle(dto);
  }

  @Put('vehicles/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '编辑车辆' })
  async updateVehicle(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateVehicle(Number(id), dto);
  }

  @Put('vehicles/:id/status')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '变更车辆状态（上架/下架/维护）' })
  async updateVehicleStatus(
    @Param('id') id: string,
    @Body() body: { status: number; reason?: string },
  ) {
    return this.adminService.updateVehicleStatus(
      Number(id),
      body.status,
      body.reason,
    );
  }

  // ==================== 车型管理 ====================

  @Get('models')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '车型列表' })
  async getModelList(@Query() query: any) {
    return this.adminService.getModelList(query);
  }

  @Post('models')
  @Roles('admin')
  @ApiOperation({ summary: '新增车型' })
  async createModel(@Body() dto: any) {
    return this.adminService.createModel(dto);
  }

  @Put('models/:id')
  @Roles('admin')
  @ApiOperation({ summary: '编辑车型' })
  async updateModel(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateModel(Number(id), dto);
  }

  // ==================== 门店管理 ====================

  @Get('stores')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '门店列表' })
  async getStoreList(@Query() query: any) {
    return this.adminService.getStoreList(query);
  }

  @Post('stores')
  @Roles('admin')
  @ApiOperation({ summary: '新增门店' })
  async createStore(@Body() dto: any) {
    return this.adminService.createStore(dto);
  }

  @Put('stores/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '编辑门店' })
  async updateStore(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateStore(Number(id), dto);
  }

  // ==================== 订单管理 ====================

  @Get('orders')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '订单列表（管理员视角）' })
  async getOrderList(@Query() query: any) {
    return this.adminService.getOrderList(query);
  }

  @Get('orders/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '订单详情（管理员）' })
  async getOrderDetail(@Param('id') id: string) {
    return this.adminService.getOrderDetail(Number(id));
  }

  @Put('orders/:id/status')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '手动调整订单状态' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: number; remark?: string },
  ) {
    return this.adminService.updateOrderStatus(
      Number(id),
      body.status,
      body.remark,
    );
  }

  // ==================== 用户管理 ====================

  @Get('users')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '用户列表' })
  async getUserList(@Query() query: any) {
    return this.adminService.getUserList(query);
  }

  @Get('users/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '用户详情' })
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(Number(id));
  }

  @Put('users/:id/status')
  @Roles('admin')
  @ApiOperation({ summary: '封禁/解封用户' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: number; reason?: string },
  ) {
    return this.adminService.updateUserStatus(
      Number(id),
      body.status,
      body.reason,
    );
  }

  // ==================== 收入统计 (T3W9-3) ====================

  @Get('stats/revenue')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: '收入趋势统计（按时间范围+粒度）' })
  async getRevenueStats(@Query() query: any) {
    return this.adminService.getRevenueStats(query);
  }

  // ==================== 对账管理 (T3W9-3) ====================

  @Get('stats/reconciliation')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: '对账汇总（系统记录 vs 第三方实际）' })
  async getReconciliation(@Query() query: any) {
    return this.adminService.getReconciliation(query);
  }

  @Get('stats/reconciliation/detail')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: '流水明细列表' })
  async getPaymentDetailList(@Query() query: any) {
    return this.adminService.getPaymentDetailList(query);
  }

  // ==================== Dashboard 增强 (T3W9-3) ====================

  @Get('dashboard/full')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '完整Dashboard数据（含会员分布/热门车型/最近支付）' })
  async getFullDashboard() {
    return this.adminService.getFullDashboard();
  }

  // ==================== 审计日志 (T3W14-6) ====================

  @Get('audit-logs')
  @Roles('admin')
  @ApiOperation({ summary: '审计日志列表' })
  async getAuditLogs(@Query() query: any) {
    return this.adminService.getAuditLogs(query);
  }
}
