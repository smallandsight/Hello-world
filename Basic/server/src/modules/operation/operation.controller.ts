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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OperationService } from './operation.service';
import { ExceptionType, ExceptionStatus } from './entities/exception-log.entity';
import { TransferStatus } from './entities/vehicle-transfer.entity';
import { MessageType } from './entities/message-template.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('运营工具')
@Controller('operation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  // ==================== 异常处理SOP ====================

  @Get('exceptions')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '获取异常列表' })
  @ApiQuery({ name: 'type', required: false, enum: ExceptionType })
  @ApiQuery({ name: 'status', required: false, enum: ExceptionStatus })
  async getExceptions(
    @Query('type') type?: ExceptionType,
    @Query('status') status?: ExceptionStatus,
    @Query('orderId') orderId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.operationService.getExceptions({ type, status, orderId, page, pageSize });
  }

  @Get('exceptions/:id')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '获取异常详情' })
  async getExceptionDetail(@Param('id') id: string) {
    return this.operationService.getExceptionDetail(id);
  }

  @Post('exceptions/:id/process')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '处理异常下一步' })
  async processExceptionStep(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() body: { handlerName: string; result: string; remark?: string },
  ) {
    return this.operationService.processExceptionStep(
      id,
      userId,
      body.handlerName,
      body.result,
      body.remark,
    );
  }

  @Post('exceptions/scan')
  @Roles('admin')
  @ApiOperation({ summary: '扫描并创建异常（手动触发）' })
  async scanExceptions() {
    const exceptions = await this.operationService.scanExceptions();
    return { count: exceptions.length, exceptions };
  }

  @Get('sop/list')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '获取SOP定义列表' })
  async getSOPDefinitions() {
    return this.operationService.getSOPDefinitions();
  }

  // ==================== 车辆调配管理 ====================

  @Get('transfers')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '获取调拨单列表' })
  async getTransfers(
    @Query('status') status?: TransferStatus,
    @Query('fromStoreId') fromStoreId?: string,
    @Query('toStoreId') toStoreId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.operationService.getTransfers({
      status,
      fromStoreId,
      toStoreId,
      page,
      pageSize,
    });
  }

  @Post('transfers/create')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '创建调拨单' })
  async createTransfer(@Body() data: any) {
    return this.operationService.createTransfer(data);
  }

  @Post('transfers/:id/approve')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '审批调拨单' })
  async approveTransfer(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() body: { approverName: string; remark?: string },
  ) {
    return this.operationService.approveTransfer(id, userId, body.approverName, body.remark);
  }

  @Post('transfers/:id/start')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '开始调拨' })
  async startTransfer(
    @Param('id') id: string,
    @Body() body: { handlerName: string },
    @CurrentUser() userId: string,
  ) {
    return this.operationService.startTransfer(id, userId, body.handlerName);
  }

  @Post('transfers/:id/complete')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '完成调拨' })
  async completeTransfer(@Param('id') id: string) {
    return this.operationService.completeTransfer(id);
  }

  @Post('transfers/:id/cancel')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '取消调拨' })
  async cancelTransfer(@Param('id') id: string, @Body('reason') reason: string) {
    return this.operationService.cancelTransfer(id, reason);
  }

  // ==================== 批量操作工具 ====================

  @Post('batch/publish-vehicles')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '批量上架车辆' })
  async batchPublishVehicles(
    @Body('vehicleIds') vehicleIds: string[],
    @CurrentUser() userId: string,
  ) {
    return this.operationService.batchPublishVehicles(vehicleIds, userId);
  }

  @Post('batch/unpublish-vehicles')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '批量下架车辆' })
  async batchUnpublishVehicles(
    @Body('vehicleIds') vehicleIds: string[],
    @CurrentUser() userId: string,
  ) {
    return this.operationService.batchUnpublishVehicles(vehicleIds, userId);
  }

  @Post('batch/adjust-price')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '批量调价' })
  async batchAdjustPrice(
    @Body('modelIds') modelIds: string[],
    @Body('adjustmentPercent') adjustmentPercent: number,
    @CurrentUser() userId: string,
  ) {
    return this.operationService.batchAdjustPrice(modelIds, adjustmentPercent, userId);
  }

  @Post('batch/send-notification')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '批量发送通知' })
  async batchSendNotification(
    @Body('userIds') userIds: string[],
    @Body('title') title: string,
    @Body('content') content: string,
  ) {
    return this.operationService.batchSendNotification(userIds, title, content);
  }

  // ==================== 消息模板管理 ====================

  @Get('templates')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '获取消息模板列表' })
  async getTemplates(
    @Query('type') type?: MessageType,
    @Query('status') status?: boolean,
  ) {
    return this.operationService.getTemplates({ type, status });
  }

  @Post('templates')
  @Roles('admin')
  @ApiOperation({ summary: '创建消息模板' })
  async createTemplate(@Body() data: any) {
    return this.operationService.createTemplate(data);
  }

  @Put('templates/:id')
  @Roles('admin')
  @ApiOperation({ summary: '更新消息模板' })
  async updateTemplate(@Param('id') id: string, @Body() data: any) {
    return this.operationService.updateTemplate(id, data);
  }

  @Post('templates/preview')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '预览模板渲染' })
  async previewTemplate(
    @Body('code') code: string,
    @Body('variables') variables: Record<string, string>,
  ) {
    return this.operationService.previewTemplate(code, variables);
  }

  // ==================== 报告生成 ====================

  @Post('reports/daily')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '生成日报' })
  async generateDailyReport() {
    await this.operationService.generateDailyReport();
    return { message: '日报已生成' };
  }

  @Post('reports/weekly')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '生成周报' })
  async generateWeeklyReport() {
    await this.operationService.generateWeeklyReport();
    return { message: '周报已生成' };
  }

  @Post('reports/monthly')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '生成月报' })
  async generateMonthlyReport() {
    await this.operationService.generateMonthlyReport();
    return { message: '月报已生成' };
  }
}