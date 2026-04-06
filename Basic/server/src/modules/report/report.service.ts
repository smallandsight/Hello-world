import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Store } from '../store/entities/store.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { Refund } from '../payment/entities/refund.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { AnalyticsDaily } from '../analytics/entities/analytics-daily.entity';

/**
 * 报表服务
 * 提供财务报表、运营报表、自定义报表等API
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Refund)
    private refundRepo: Repository<Refund>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(AnalyticsDaily)
    private dailyRepo: Repository<AnalyticsDaily>,
  ) {}

  // ==================== 财务报表 ====================

  /**
   * 收支明细报表
   */
  async getIncomeExpenseReport(
    startDate: string,
    endDate: string,
    options?: { storeId?: string },
  ): Promise<{
    date: string;
    income: number;
    expense: number;
    net: number;
    details: {
      type: string;
      amount: number;
      count: number;
    }[];
  }[]> {
    const query = this.dailyRepo.createQueryBuilder('daily')
      .where('daily.date BETWEEN :start AND :end', { start: startDate, end: endDate })
      .orderBy('daily.date', 'ASC');

    const dailyRecords = await query.getMany();

    return dailyRecords.map(d => ({
      date: d.date,
      income: Number(d.netIncomeCents),
      expense: Number(d.refundAmountCents),
      net: Number(d.netIncomeCents) - Number(d.refundAmountCents),
      details: [
        { type: '租金收入', amount: Number(d.rentalIncomeCents), count: d.newOrders },
        { type: '保险收入', amount: Number(d.insuranceIncomeCents), count: d.newOrders },
        { type: '服务费', amount: Number(d.serviceFeeCents), count: d.newOrders },
        { type: '退款', amount: Number(d.refundAmountCents), count: d.cancelledOrders },
      ],
    }));
  }

  /**
   * 对账单报表
   */
  async getReconciliationReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    summary: {
      totalOrders: number;
      expectedAmount: number;
      actualAmount: number;
      difference: number;
      reconciliationRate: number;
    };
    details: {
      date: string;
      orders: number;
      expected: number;
      actual: number;
      difference: number;
    }[];
    exceptions: {
      orderId: string;
      orderNo: string;
      expected: number;
      actual: number;
      difference: number;
      reason: string;
    }[];
  }> {
    // 获取时间范围内的订单
    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(new Date(`${startDate} 00:00:00`), new Date(`${endDate} 23:59:59`)),
      },
      relations: ['payments'],
    });

    // 按日期分组
    const dateMap = new Map<string, {
      orders: number;
      expected: number;
      actual: number;
    }>();

    const exceptions: any[] = [];

    for (const order of orders) {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      const expected = Number(order.totalAmountCents || 0);
      const actual = order.payments
        ?.filter(p => p.status === 'success')
        .reduce((sum, p) => sum + Number(p.amountCents || 0), 0) || 0;

      if (!dateMap.has(date)) {
        dateMap.set(date, { orders: 0, expected: 0, actual: 0 });
      }
      const dayData = dateMap.get(date)!;
      dayData.orders++;
      dayData.expected += expected;
      dayData.actual += actual;

      // 检查差异
      if (Math.abs(expected - actual) > 100) { // 差异超过1元
        exceptions.push({
          orderId: order.id,
          orderNo: order.orderNo,
          expected,
          actual,
          difference: actual - expected,
          reason: actual < expected ? '少收' : '多收',
        });
      }
    }

    const details = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        expected: data.expected,
        actual: data.actual,
        difference: data.actual - data.expected,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      totalOrders: orders.length,
      expectedAmount: details.reduce((sum, d) => sum + d.expected, 0),
      actualAmount: details.reduce((sum, d) => sum + d.actual, 0),
      difference: details.reduce((sum, d) => sum + d.difference, 0),
      reconciliationRate: 0,
    };

    summary.reconciliationRate = summary.expectedAmount > 0
      ? Math.round((summary.actualAmount / summary.expectedAmount) * 10000) / 100
      : 0;

    return { summary, details, exceptions };
  }

  /**
   * 结算单报表（按门店）
   */
  async getSettlementReport(
    startDate: string,
    endDate: string,
    storeId?: string,
  ): Promise<{
    storeId: string;
    storeName: string;
    period: { start: string; end: string };
    orders: number;
    grossAmount: number;
    refunds: number;
    commission: number;
    netAmount: number;
    status: string;
  }[]> {
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.pickupStore', 'store')
      .select('order.pickupStoreId', 'storeId')
      .addSelect('store.name', 'storeName')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.totalAmountCents)', 'grossAmount')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: `${startDate} 00:00:00`,
        end: `${endDate} 23:59:59`,
      })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      })
      .groupBy('order.pickupStoreId');

    if (storeId) {
      query.andWhere('order.pickupStoreId = :storeId', { storeId });
    }

    const results = await query.getRawMany();

    return results.map(r => {
      const grossAmount = Number(r.grossAmount || 0);
      const commission = Math.round(grossAmount * 0.05); // 假设5%佣金
      const refunds = 0; // 需要单独查询

      return {
        storeId: r.storeId,
        storeName: r.storeName || '未知门店',
        period: { start: startDate, end: endDate },
        orders: Number(r.orders),
        grossAmount,
        refunds,
        commission,
        netAmount: grossAmount - refunds - commission,
        status: '待结算',
      };
    });
  }

  /**
   * 税务报表
   */
  async getTaxReport(
    year: number,
    month: number,
  ): Promise<{
    period: string;
    totalRevenue: number;
    taxableRevenue: number;
    taxRate: number;
    taxAmount: number;
    invoicesIssued: number;
    invoicesPending: number;
    details: {
      category: string;
      amount: number;
      taxAmount: number;
    }[];
  }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const invoices = await this.invoiceRepo.find({
      where: {
        createdAt: Between(new Date(`${startDate} 00:00:00`), new Date(`${endDate} 23:59:59`)),
      },
    });

    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
    });

    const totalRevenue = dailyRecords.reduce((sum, d) => sum + Number(d.netIncomeCents), 0);
    const taxRate = 6; // 假设税率6%
    const taxableRevenue = Math.round(totalRevenue / (1 + taxRate / 100));
    const taxAmount = Math.round((taxableRevenue * taxRate) / 100);

    const invoicesIssued = invoices.filter(i => i.status === 'issued').length;
    const invoicesPending = invoices.filter(i => i.status === 'pending').length;

    return {
      period: `${year}年${month}月`,
      totalRevenue,
      taxableRevenue,
      taxRate,
      taxAmount,
      invoicesIssued,
      invoicesPending,
      details: [
        { category: '租金收入', amount: dailyRecords.reduce((sum, d) => sum + Number(d.rentalIncomeCents), 0), taxAmount: 0 },
        { category: '保险收入', amount: dailyRecords.reduce((sum, d) => sum + Number(d.insuranceIncomeCents), 0), taxAmount: 0 },
        { category: '服务费', amount: dailyRecords.reduce((sum, d) => sum + Number(d.serviceFeeCents), 0), taxAmount: 0 },
      ],
    };
  }

  /**
   * 资金流水报表
   */
  async getCashFlowReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    date: string;
    openingBalance: number;
    inflow: number;
    outflow: number;
    closingBalance: number;
    transactions: {
      id: string;
      type: string;
      amount: number;
      description: string;
      time: Date;
    }[];
  }[]> {
    // 获取钱包交易流水
    const transactions = await this.walletTxRepo.find({
      where: {
        createdAt: Between(new Date(`${startDate} 00:00:00`), new Date(`${endDate} 23:59:59`)),
      },
      order: { createdAt: 'ASC' },
    });

    // 按日期分组
    const dateMap = new Map<string, {
      inflow: number;
      outflow: number;
      transactions: any[];
    }>();

    for (const tx of transactions) {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { inflow: 0, outflow: 0, transactions: [] });
      }
      const dayData = dateMap.get(date)!;
      const amount = Number(tx.amountCents || 0);

      if (tx.type === 'credit') {
        dayData.inflow += amount;
      } else {
        dayData.outflow += amount;
      }

      dayData.transactions.push({
        id: tx.id,
        type: tx.type,
        amount,
        description: tx.description || '',
        time: tx.createdAt,
      });
    }

    let runningBalance = 0; // 简化：实际应从钱包余额获取

    return Array.from(dateMap.entries())
      .map(([date, data]) => {
        const openingBalance = runningBalance;
        runningBalance += data.inflow - data.outflow;

        return {
          date,
          openingBalance,
          inflow: data.inflow,
          outflow: data.outflow,
          closingBalance: runningBalance,
          transactions: data.transactions,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 利润表
   */
  async getProfitReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    period: { start: string; end: string };
    revenue: {
      rental: number;
      insurance: number;
      service: number;
      other: number;
      total: number;
    };
    costs: {
      depreciation: number;
      maintenance: number;
      insurance: number;
      other: number;
      total: number;
    };
    grossProfit: number;
    operatingExpenses: {
      marketing: number;
      salaries: number;
      rent: number;
      utilities: number;
      other: number;
      total: number;
    };
    netProfit: number;
    profitMargin: number;
  }> {
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
    });

    // 收入
    const revenue = {
      rental: dailyRecords.reduce((sum, d) => sum + Number(d.rentalIncomeCents), 0),
      insurance: dailyRecords.reduce((sum, d) => sum + Number(d.insuranceIncomeCents), 0),
      service: dailyRecords.reduce((sum, d) => sum + Number(d.serviceFeeCents), 0),
      other: dailyRecords.reduce((sum, d) => sum + Number(d.otherIncomeCents), 0),
      total: 0,
    };
    revenue.total = revenue.rental + revenue.insurance + revenue.service + revenue.other;

    // 成本（简化：假设值）
    const costs = {
      depreciation: Math.round(revenue.rental * 0.15),
      maintenance: Math.round(revenue.rental * 0.05),
      insurance: Math.round(revenue.rental * 0.03),
      other: Math.round(revenue.rental * 0.02),
      total: 0,
    };
    costs.total = costs.depreciation + costs.maintenance + costs.insurance + costs.other;

    const grossProfit = revenue.total - costs.total;

    // 运营费用（简化：假设值）
    const operatingExpenses = {
      marketing: Math.round(revenue.total * 0.1),
      salaries: Math.round(revenue.total * 0.15),
      rent: Math.round(revenue.total * 0.05),
      utilities: Math.round(revenue.total * 0.02),
      other: Math.round(revenue.total * 0.03),
      total: 0,
    };
    operatingExpenses.total = operatingExpenses.marketing + operatingExpenses.salaries +
      operatingExpenses.rent + operatingExpenses.utilities + operatingExpenses.other;

    const netProfit = grossProfit - operatingExpenses.total;
    const profitMargin = revenue.total > 0
      ? Math.round((netProfit / revenue.total) * 10000) / 100
      : 0;

    return {
      period: { start: startDate, end: endDate },
      revenue,
      costs,
      grossProfit,
      operatingExpenses,
      netProfit,
      profitMargin,
    };
  }

  // ==================== 运营报表 ====================

  /**
   * 用户增长报表
   */
  async getUserGrowthReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    date: string;
    newUsers: number;
    activeUsers: number;
    newMembers: number;
    retentionRate: number;
    cumulative: number;
  }[]> {
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    let cumulative = 0;

    return dailyRecords.map(d => {
      cumulative += d.newUsers;

      return {
        date: d.date,
        newUsers: d.newUsers,
        activeUsers: d.activeUsers,
        newMembers: d.newMembers,
        retentionRate: 0, // 需要单独计算
        cumulative,
      };
    });
  }

  /**
   * 车辆利用率报表
   */
  async getVehicleUtilizationReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    date: string;
    totalVehicles: number;
    availableVehicles: number;
    rentedVehicles: number;
    utilizationRate: number;
    avgRentalHours: number;
  }[]> {
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    return dailyRecords.map(d => ({
      date: d.date,
      totalVehicles: d.totalVehicles,
      availableVehicles: d.availableVehicles,
      rentedVehicles: d.rentedVehicles,
      utilizationRate: d.utilizationRate / 100,
      avgRentalHours: d.avgRentalHours / 100,
    }));
  }

  /**
   * 营销ROI报表
   */
  async getMarketingROIReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    date: string;
    couponIssued: number;
    couponUsed: number;
    couponDiscount: number;
    orderFromCoupon: number;
    revenueFromCoupon: number;
    roi: number;
  }[]> {
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    return dailyRecords.map(d => {
      // 简化：假设优惠券使用带来的订单转化
      const orderFromCoupon = Math.round(d.couponUsed * 0.7); // 70%转化率
      const revenueFromCoupon = Math.round(Number(d.orderAmountCents) * 0.3); // 假设30%收入来自优惠券
      const cost = Number(d.couponDiscountCents);
      const roi = cost > 0
        ? Math.round(((revenueFromCoupon - cost) / cost) * 10000) / 100
        : 0;

      return {
        date: d.date,
        couponIssued: d.couponIssued,
        couponUsed: d.couponUsed,
        couponDiscount: Number(d.couponDiscountCents),
        orderFromCoupon,
        revenueFromCoupon,
        roi,
      };
    });
  }

  // ==================== 自定义报表 ====================

  /**
   * 生成自定义报表
   */
  async generateCustomReport(options: {
    startDate: string;
    endDate: string;
    metrics: string[];
    dimensions?: string[];
    filters?: Record<string, any>;
  }): Promise<{
    headers: string[];
    data: Record<string, any>[];
    summary: Record<string, number>;
  }> {
    const { startDate, endDate, metrics, dimensions = [], filters = {} } = options;

    // 获取基础数据
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    // 构建表头
    const headers = ['日期', ...metrics.map(m => this.translateMetric(m))];

    // 构建数据
    const data = dailyRecords.map(d => {
      const row: Record<string, any> = { 日期: d.date };

      for (const metric of metrics) {
        row[this.translateMetric(metric)] = this.getMetricValue(d, metric);
      }

      return row;
    });

    // 计算汇总
    const summary: Record<string, number> = {};
    for (const metric of metrics) {
      summary[metric] = dailyRecords.reduce((sum, d) => sum + this.getMetricValue(d, metric), 0);
    }

    return { headers, data, summary };
  }

  // ==================== 报表导出 ====================

  /**
   * 导出报表为Excel
   */
  async exportToExcel(
    reportType: string,
    data: any[],
    options?: {
      title?: string;
      sheetName?: string;
    },
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options?.sheetName || '报表');

    // 添加标题
    if (options?.title) {
      worksheet.mergeCells('A1:Z1');
      worksheet.getCell('A1').value = options.title;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
    }

    if (data.length === 0) {
      worksheet.addRow(['暂无数据']);
      return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }

    // 添加表头
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 添加数据行
    for (const row of data) {
      worksheet.addRow(Object.values(row));
    }

    // 自动列宽
    worksheet.columns.forEach(column => {
      const lengths = column.values?.map(v => (v?.toString() || '').length) || [];
      column.width = Math.max(...lengths) + 2;
    });

    // 添加边框
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // ==================== 辅助方法 ====================

  private translateMetric(metric: string): string {
    const map: Record<string, string> = {
      newUsers: '新增用户',
      activeUsers: '活跃用户',
      newOrders: '新增订单',
      completedOrders: '完成订单',
      orderAmountCents: '订单金额',
      netIncomeCents: '净收入',
      utilizationRate: '利用率',
      couponUsed: '优惠券使用',
    };
    return map[metric] || metric;
  }

  private getMetricValue(daily: AnalyticsDaily, metric: string): number {
    switch (metric) {
      case 'newUsers':
        return daily.newUsers;
      case 'activeUsers':
        return daily.activeUsers;
      case 'newOrders':
        return daily.newOrders;
      case 'completedOrders':
        return daily.completedOrders;
      case 'orderAmountCents':
        return Number(daily.orderAmountCents);
      case 'netIncomeCents':
        return Number(daily.netIncomeCents);
      case 'utilizationRate':
        return daily.utilizationRate / 100;
      case 'couponUsed':
        return daily.couponUsed;
      default:
        return 0;
    }
  }
}