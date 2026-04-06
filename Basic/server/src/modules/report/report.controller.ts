import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/permissions.decorator';

@ApiTags('报表')
@Controller('report')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ==================== 财务报表 ====================

  @Get('finance/income-expense')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '收支明细报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getIncomeExpenseReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportService.getIncomeExpenseReport(startDate, endDate, { storeId });
  }

  @Get('finance/reconciliation')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '对账单报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getReconciliationReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getReconciliationReport(startDate, endDate);
  }

  @Get('finance/settlement')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '结算单报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getSettlementReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportService.getSettlementReport(startDate, endDate, storeId);
  }

  @Get('finance/tax')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '税务报表' })
  async getTaxReport(
    @Query('year', new ParseIntPipe()) year: number,
    @Query('month', new ParseIntPipe()) month: number,
  ) {
    return this.reportService.getTaxReport(year, month);
  }

  @Get('finance/cash-flow')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '资金流水报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getCashFlowReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getCashFlowReport(startDate, endDate);
  }

  @Get('finance/profit')
  @Roles('admin', 'finance')
  @ApiOperation({ summary: '利润表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getProfitReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getProfitReport(startDate, endDate);
  }

  // ==================== 运营报表 ====================

  @Get('operation/user-growth')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '用户增长报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getUserGrowthReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getUserGrowthReport(startDate, endDate);
  }

  @Get('operation/vehicle-utilization')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '车辆利用率报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getVehicleUtilizationReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getVehicleUtilizationReport(startDate, endDate);
  }

  @Get('operation/marketing-roi')
  @Roles('admin', 'operation')
  @ApiOperation({ summary: '营销ROI报表' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getMarketingROIReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getMarketingROIReport(startDate, endDate);
  }

  // ==================== 自定义报表 ====================

  @Get('custom')
  @Roles('admin')
  @ApiOperation({ summary: '自定义报表' })
  async getCustomReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('metrics') metrics: string,
    @Query('dimensions') dimensions?: string,
  ) {
    return this.reportService.generateCustomReport({
      startDate,
      endDate,
      metrics: metrics.split(','),
      dimensions: dimensions?.split(',') || [],
    });
  }

  // ==================== 报表导出 ====================

  @Get('export/:type')
  @Roles('admin', 'finance', 'operation')
  @ApiOperation({ summary: '导出报表' })
  async exportReport(
    @Param('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    let data: any[];
    let title: string;

    switch (type) {
      case 'income-expense':
        data = await this.reportService.getIncomeExpenseReport(startDate, endDate);
        title = `收支明细报表 (${startDate} ~ ${endDate})`;
        break;
      case 'reconciliation':
        const reconciliation = await this.reportService.getReconciliationReport(startDate, endDate);
        data = reconciliation.details;
        title = `对账单报表 (${startDate} ~ ${endDate})`;
        break;
      case 'user-growth':
        data = await this.reportService.getUserGrowthReport(startDate, endDate);
        title = `用户增长报表 (${startDate} ~ ${endDate})`;
        break;
      case 'vehicle-utilization':
        data = await this.reportService.getVehicleUtilizationReport(startDate, endDate);
        title = `车辆利用率报表 (${startDate} ~ ${endDate})`;
        break;
      case 'marketing-roi':
        data = await this.reportService.getMarketingROIReport(startDate, endDate);
        title = `营销ROI报表 (${startDate} ~ ${endDate})`;
        break;
      default:
        throw new Error(`不支持的报表类型: ${type}`);
    }

    const buffer = await this.reportService.exportToExcel(type, data, { title });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${startDate}_${endDate}.xlsx`);
    res.send(buffer);
  }
}