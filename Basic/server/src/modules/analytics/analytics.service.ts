import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { InjectRedis } from '../../common/redis/redis.module';
import Redis from 'ioredis';
import { AnalyticsDaily } from './entities/analytics-daily.entity';
import { AnalyticsWeekly } from './entities/analytics-weekly.entity';
import { AnalyticsMonthly } from './entities/analytics-monthly.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';

/**
 * 数据分析服务
 * 提供用户分群、订单分析、车辆分析、收入分析等API
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsDaily)
    private dailyRepo: Repository<AnalyticsDaily>,
    @InjectRepository(AnalyticsWeekly)
    private weeklyRepo: Repository<AnalyticsWeekly>,
    @InjectRepository(AnalyticsMonthly)
    private monthlyRepo: Repository<AnalyticsMonthly>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRedis() private redis: Redis,
  ) {}

  // ==================== 用户分析 ====================

  /**
   * 计算用户RFM值
   * R (Recency): 最近一次消费距今天数
   * F (Frequency): 消费频次
   * M (Monetary): 消费金额
   */
  async calculateRFM(userId: string): Promise<{
    recency: number;
    frequency: number;
    monetary: number;
    score: number;
    segment: string;
  }> {
    const orders = await this.orderRepo.find({
      where: { userId, status: OrderStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      take: 100, // 最近100单
    });

    if (orders.length === 0) {
      return {
        recency: 999,
        frequency: 0,
        monetary: 0,
        score: 0,
        segment: '无消费',
      };
    }

    // R: 最近一次消费距今天数
    const lastOrder = orders[0];
    const recency = Math.floor(
      (Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // F: 消费频次（最近90天）
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentOrders = orders.filter(o => new Date(o.createdAt) >= ninetyDaysAgo);
    const frequency = recentOrders.length;

    // M: 消费金额总和
    const monetary = orders.reduce((sum, o) => sum + Number(o.totalAmountCents || 0), 0);

    // RFM评分（简化版：各维度5分制）
    const rScore = recency <= 7 ? 5 : recency <= 30 ? 4 : recency <= 60 ? 3 : recency <= 90 ? 2 : 1;
    const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 1 ? 2 : 1;
    const mScore = monetary >= 1000000 ? 5 : monetary >= 500000 ? 4 : monetary >= 200000 ? 3 : monetary >= 50000 ? 2 : 1;

    const score = rScore + fScore + mScore;

    // 用户分群
    let segment = '普通用户';
    if (score >= 13) {
      segment = '高价值用户';
    } else if (score >= 10) {
      segment = '活跃用户';
    } else if (score >= 7) {
      segment = '潜力用户';
    } else if (score >= 4) {
      segment = '沉睡用户';
    } else {
      segment = '流失用户';
    }

    return {
      recency,
      frequency,
      monetary: Math.round(monetary),
      score,
      segment,
    };
  }

  /**
   * 用户分群统计
   */
  async getUserSegments(): Promise<{
    highValue: number;
    active: number;
    potential: number;
    dormant: number;
    churned: number;
  }> {
    const cacheKey = 'analytics:user_segments';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 获取所有有订单的用户
    const usersWithOrders = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.totalAmountCents)', 'totalAmount')
      .addSelect('MAX(order.createdAt)', 'lastOrderTime')
      .groupBy('order.userId')
      .getRawMany();

    let highValue = 0;
    let active = 0;
    let potential = 0;
    let dormant = 0;
    let churned = 0;

    for (const user of usersWithOrders) {
      const rfm = await this.calculateRFM(user.userId);

      switch (rfm.segment) {
        case '高价值用户':
          highValue++;
          break;
        case '活跃用户':
          active++;
          break;
        case '潜力用户':
          potential++;
          break;
        case '沉睡用户':
          dormant++;
          break;
        case '流失用户':
          churned++;
          break;
      }
    }

    const result = { highValue, active, potential, dormant, churned };

    // 缓存1小时
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * RFM分布统计
   */
  async getRFMDistribution(): Promise<{
    recencyDistribution: { range: string; count: number }[];
    frequencyDistribution: { range: string; count: number }[];
    monetaryDistribution: { range: string; count: number }[];
  }> {
    const users = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('MAX(order.createdAt)', 'lastOrderTime')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.totalAmountCents)', 'totalAmount')
      .groupBy('order.userId')
      .getRawMany();

    // R分布
    const recencyDistribution = [
      { range: '7天内', count: 0 },
      { range: '8-30天', count: 0 },
      { range: '31-60天', count: 0 },
      { range: '61-90天', count: 0 },
      { range: '90天以上', count: 0 },
    ];

    // F分布
    const frequencyDistribution = [
      { range: '1次', count: 0 },
      { range: '2-3次', count: 0 },
      { range: '4-5次', count: 0 },
      { range: '6-10次', count: 0 },
      { range: '10次以上', count: 0 },
    ];

    // M分布
    const monetaryDistribution = [
      { range: '0-500元', count: 0 },
      { range: '500-2000元', count: 0 },
      { range: '2000-5000元', count: 0 },
      { range: '5000-10000元', count: 0 },
      { range: '10000元以上', count: 0 },
    ];

    for (const user of usersWithOrders) {
      const days = Math.floor(
        (Date.now() - new Date(user.lastOrderTime).getTime()) / (1000 * 60 * 60 * 24),
      );
      const count = Number(user.orderCount);
      const amount = Number(user.totalAmount) / 100; // 转为元

      // R
      if (days <= 7) recencyDistribution[0].count++;
      else if (days <= 30) recencyDistribution[1].count++;
      else if (days <= 60) recencyDistribution[2].count++;
      else if (days <= 90) recencyDistribution[3].count++;
      else recencyDistribution[4].count++;

      // F
      if (count === 1) frequencyDistribution[0].count++;
      else if (count <= 3) frequencyDistribution[1].count++;
      else if (count <= 5) frequencyDistribution[2].count++;
      else if (count <= 10) frequencyDistribution[3].count++;
      else frequencyDistribution[4].count++;

      // M
      if (amount <= 500) monetaryDistribution[0].count++;
      else if (amount <= 2000) monetaryDistribution[1].count++;
      else if (amount <= 5000) monetaryDistribution[2].count++;
      else if (amount <= 10000) monetaryDistribution[3].count++;
      else monetaryDistribution[4].count++;
    }

    return { recencyDistribution, frequencyDistribution, monetaryDistribution };
  }

  // ==================== 订单分析 ====================

  /**
   * 订单趋势分析
   */
  async getOrderTrend(
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<{
    date: string;
    orders: number;
    amount: number;
  }[]> {
    let data: any[];

    if (granularity === 'day') {
      data = await this.dailyRepo.find({
        where: { date: Between(startDate, endDate) },
        order: { date: 'ASC' },
      });
      return data.map(d => ({
        date: d.date,
        orders: d.newOrders,
        amount: Number(d.orderAmountCents),
      }));
    } else if (granularity === 'week') {
      data = await this.weeklyRepo.find({
        where: {
          startDate: MoreThanOrEqual(startDate),
          endDate: LessThanOrEqual(endDate),
        },
        order: { year: 'ASC', week: 'ASC' },
      });
      return data.map(w => ({
        date: `${w.year}-W${w.week}`,
        orders: w.newOrders,
        amount: Number(w.totalIncomeCents),
      }));
    } else {
      data = await this.monthlyRepo.find({
        where: {
          startDate: MoreThanOrEqual(startDate),
          endDate: LessThanOrEqual(endDate),
        },
        order: { year: 'ASC', month: 'ASC' },
      });
      return data.map(m => ({
        date: `${m.year}-${String(m.month).padStart(2, '0')}`,
        orders: m.newOrders,
        amount: Number(m.netIncomeCents),
      }));
    }
  }

  /**
   * 下单转化率分析
   */
  async getConversionRate(startDate: string, endDate: string): Promise<{
    visitors: number;
    browsers: number;
    orders: number;
    conversionRate: number;
  }> {
    // 简化实现：实际需要从埋点数据获取
    const orders = await this.orderRepo.count({
      where: {
        createdAt: Between(new Date(startDate), new Date(endDate)),
      },
    });

    // 假设浏览量是订单量的10倍（实际应从埋点获取）
    const browsers = orders * 10;
    const conversionRate = browsers > 0 ? Math.round((orders / browsers) * 10000) / 100 : 0;

    return {
      visitors: Math.round(browsers * 0.6), // 假设访客是浏览量的60%
      browsers,
      orders,
      conversionRate,
    };
  }

  /**
   * 高峰时段分析
   */
  async getPeakHours(startDate: string, endDate: string): Promise<{
    hour: number;
    orders: number;
    amount: number;
  }[]> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .select('HOUR(order.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.totalAmountCents)', 'amount')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('HOUR(order.createdAt)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // 填充缺失的小时
    const result = [];
    for (let h = 0; h < 24; h++) {
      const found = orders.find(o => Number(o.hour) === h);
      result.push({
        hour: h,
        orders: found ? Number(found.orders) : 0,
        amount: found ? Number(found.amount) : 0,
      });
    }

    return result;
  }

  /**
   * 客单价分析
   */
  async getAverageOrderValue(startDate: string, endDate: string): Promise<{
    overall: number;
    byStore: { storeId: string; storeName: string; avgAmount: number }[];
    byModel: { modelId: string; modelName: string; avgAmount: number }[];
  }> {
    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(new Date(startDate), new Date(endDate)),
        status: OrderStatus.COMPLETED,
      },
      relations: ['pickupStore', 'vehicle', 'vehicle.model'],
    });

    const overall = orders.length > 0
      ? Math.round(orders.reduce((sum, o) => sum + Number(o.totalAmountCents || 0), 0) / orders.length)
      : 0;

    // 按门店分组
    const storeMap = new Map<string, { name: string; total: number; count: number }>();
    for (const order of orders) {
      const storeId = order.pickupStoreId;
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          name: order.pickupStore?.name || '未知',
          total: 0,
          count: 0,
        });
      }
      const store = storeMap.get(storeId)!;
      store.total += Number(order.totalAmountCents || 0);
      store.count++;
    }

    const byStore = Array.from(storeMap.entries()).map(([storeId, data]) => ({
      storeId,
      storeName: data.name,
      avgAmount: Math.round(data.total / data.count),
    }));

    // 按车型分组
    const modelMap = new Map<string, { name: string; total: number; count: number }>();
    for (const order of orders) {
      const modelId = order.vehicle?.modelId;
      if (!modelId) continue;
      if (!modelMap.has(modelId)) {
        modelMap.set(modelId, {
          name: order.vehicle?.model?.name || '未知',
          total: 0,
          count: 0,
        });
      }
      const model = modelMap.get(modelId)!;
      model.total += Number(order.totalAmountCents || 0);
      model.count++;
    }

    const byModel = Array.from(modelMap.entries()).map(([modelId, data]) => ({
      modelId,
      modelName: data.name,
      avgAmount: Math.round(data.total / data.count),
    }));

    return { overall, byStore, byModel };
  }

  // ==================== 车辆分析 ====================

  /**
   * 车辆利用率分析
   */
  async getUtilizationRate(startDate: string, endDate: string): Promise<{
    overall: number;
    byVehicle: { vehicleId: string; plateNumber: string; rate: number }[];
    byModel: { modelId: string; modelName: string; rate: number }[];
  }> {
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    // 计算总体利用率
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
    });

    const overall = dailyRecords.length > 0
      ? Math.round(dailyRecords.reduce((sum, d) => sum + d.utilizationRate, 0) / dailyRecords.length)
      : 0;

    // 按车辆计算利用率（简化：基于订单时长）
    const vehicleOrders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.vehicle', 'vehicle')
      .select('order.vehicleId', 'vehicleId')
      .addSelect('vehicle.plateNumber', 'plateNumber')
      .addSelect('SUM(TIMESTAMPDIFF(HOUR, order.actualPickupAt, order.actualReturnAt))', 'totalHours')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.actualPickupAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('order.vehicleId')
      .getRawMany();

    const totalHoursInPeriod = days * 24;
    const byVehicle = vehicleOrders.map(v => ({
      vehicleId: v.vehicleId,
      plateNumber: v.plateNumber || '未知',
      rate: Math.round((Number(v.totalHours || 0) / totalHoursInPeriod) * 10000),
    }));

    // 按车型计算
    const modelOrders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.vehicle', 'vehicle')
      .leftJoin('vehicle.model', 'model')
      .select('vehicle.modelId', 'modelId')
      .addSelect('model.name', 'modelName')
      .addSelect('COUNT(DISTINCT order.vehicleId)', 'vehicleCount')
      .addSelect('SUM(TIMESTAMPDIFF(HOUR, order.actualPickupAt, order.actualReturnAt))', 'totalHours')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.actualPickupAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('vehicle.modelId')
      .getRawMany();

    const byModel = modelOrders.map(m => {
      const vehicleTotalHours = Number(m.vehicleCount || 0) * totalHoursInPeriod;
      return {
        modelId: m.modelId,
        modelName: m.modelName || '未知',
        rate: vehicleTotalHours > 0
          ? Math.round((Number(m.totalHours || 0) / vehicleTotalHours) * 10000)
          : 0,
      };
    });

    return { overall, byVehicle, byModel };
  }

  /**
   * 热门车型分析
   */
  async getPopularModels(startDate: string, endDate: string, limit: number = 10): Promise<{
    modelId: string;
    modelName: string;
    orders: number;
    amount: number;
    avgRating: number;
  }[]> {
    const stats = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.vehicle', 'vehicle')
      .leftJoin('vehicle.model', 'model')
      .select('vehicle.modelId', 'modelId')
      .addSelect('model.name', 'modelName')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.totalAmountCents)', 'amount')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('vehicle.modelId IS NOT NULL')
      .groupBy('vehicle.modelId')
      .orderBy('orders', 'DESC')
      .limit(limit)
      .getRawMany();

    return stats.map(s => ({
      modelId: s.modelId,
      modelName: s.modelName || '未知',
      orders: Number(s.orders),
      amount: Number(s.amount),
      avgRating: 0, // 需要从评价表获取
    }));
  }

  // ==================== 收入分析 ====================

  /**
   * 收入趋势分析
   */
  async getRevenueTrend(
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<{
    date: string;
    rental: number;
    insurance: number;
    service: number;
    other: number;
    total: number;
    yoyGrowth?: number;
    momGrowth?: number;
  }[]> {
    let data: any[];

    if (granularity === 'day') {
      data = await this.dailyRepo.find({
        where: { date: Between(startDate, endDate) },
        order: { date: 'ASC' },
      });
      return data.map(d => ({
        date: d.date,
        rental: Number(d.rentalIncomeCents),
        insurance: Number(d.insuranceIncomeCents),
        service: Number(d.serviceFeeCents),
        other: Number(d.otherIncomeCents),
        total: Number(d.netIncomeCents),
      }));
    } else if (granularity === 'week') {
      data = await this.weeklyRepo.find({
        where: {
          startDate: MoreThanOrEqual(startDate),
          endDate: LessThanOrEqual(endDate),
        },
        order: { year: 'ASC', week: 'ASC' },
      });
      return data.map(w => ({
        date: `${w.year}-W${w.week}`,
        rental: 0,
        insurance: 0,
        service: 0,
        other: 0,
        total: Number(w.netIncomeCents),
        momGrowth: w.incomeGrowthRate,
      }));
    } else {
      data = await this.monthlyRepo.find({
        where: {
          startDate: MoreThanOrEqual(startDate),
          endDate: LessThanOrEqual(endDate),
        },
        order: { year: 'ASC', month: 'ASC' },
      });
      return data.map(m => ({
        date: `${m.year}-${String(m.month).padStart(2, '0')}`,
        rental: Number(m.rentalIncomeCents),
        insurance: Number(m.insuranceIncomeCents),
        service: Number(m.serviceFeeCents),
        other: Number(m.otherIncomeCents),
        total: Number(m.netIncomeCents),
        yoyGrowth: m.incomeYoYGrowth,
        momGrowth: m.incomeMoMGrowth,
      }));
    }
  }

  /**
   * 收入分类统计
   */
  async getRevenueByCategory(startDate: string, endDate: string): Promise<{
    category: string;
    amount: number;
    percentage: number;
  }[]> {
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
    });

    const rental = dailyRecords.reduce((sum, d) => sum + Number(d.rentalIncomeCents), 0);
    const insurance = dailyRecords.reduce((sum, d) => sum + Number(d.insuranceIncomeCents), 0);
    const service = dailyRecords.reduce((sum, d) => sum + Number(d.serviceFeeCents), 0);
    const other = dailyRecords.reduce((sum, d) => sum + Number(d.otherIncomeCents), 0);
    const total = rental + insurance + service + other;

    if (total === 0) {
      return [
        { category: '租金收入', amount: 0, percentage: 0 },
        { category: '保险收入', amount: 0, percentage: 0 },
        { category: '服务费', amount: 0, percentage: 0 },
        { category: '其他收入', amount: 0, percentage: 0 },
      ];
    }

    return [
      { category: '租金收入', amount: rental, percentage: Math.round((rental / total) * 10000) / 100 },
      { category: '保险收入', amount: insurance, percentage: Math.round((insurance / total) * 10000) / 100 },
      { category: '服务费', amount: service, percentage: Math.round((service / total) * 10000) / 100 },
      { category: '其他收入', amount: other, percentage: Math.round((other / total) * 10000) / 100 },
    ];
  }

  // ==================== 异常检测 ====================

  /**
   * 检查异常订单
   */
  async checkOrderExceptions(): Promise<{
    id: string;
    orderNo: string;
    type: string;
    reason: string;
    createdAt: Date;
  }[]> {
    const exceptions: any[] = [];
    const now = new Date();

    // 1. 超时未取（下单超过30分钟未取车）
    const overduePickup = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThanOrEqual(new Date(now.getTime() - 30 * 60 * 1000)),
      },
    });

    for (const order of overduePickup) {
      exceptions.push({
        id: order.id,
        orderNo: order.orderNo,
        type: 'overdue_pickup',
        reason: '下单超过30分钟未取车',
        createdAt: order.createdAt,
      });
    }

    // 2. 长期未还（超过预计还车时间24小时）
    const overdueReturn = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.IN_USE })
      .andWhere('order.expectedReturnAt < :deadline', {
        deadline: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      })
      .getMany();

    for (const order of overdueReturn) {
      exceptions.push({
        id: order.id,
        orderNo: order.orderNo,
        type: 'overdue_return',
        reason: '超过预计还车时间24小时',
        createdAt: order.createdAt,
      });
    }

    // 3. 大额订单（超过5000元）
    const largeOrders = await this.orderRepo.find({
      where: {
        totalAmountCents: MoreThanOrEqual('500000'),
        createdAt: MoreThanOrEqual(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      },
    });

    for (const order of largeOrders) {
      exceptions.push({
        id: order.id,
        orderNo: order.orderNo,
        type: 'large_amount',
        reason: `大额订单: ${Number(order.totalAmountCents) / 100}元`,
        createdAt: order.createdAt,
      });
    }

    return exceptions;
  }

  // ==================== 实时统计 ====================

  /**
   * 更新实时统计（Redis缓存）
   */
  async updateRealTimeStats(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // 今日订单数
    const todayOrders = await this.orderRepo.count({
      where: {
        createdAt: MoreThanOrEqual(new Date(`${today} 00:00:00`)),
      },
    });
    await this.redis.set('stats:today:orders', todayOrders);

    // 今日收入
    const todayAmount = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmountCents)', 'total')
      .where('order.createdAt >= :today', { today: `${today} 00:00:00` })
      .getRawOne();

    await this.redis.set('stats:today:amount', todayAmount?.total || '0');

    // 当前可用车辆
    const availableVehicles = await this.vehicleRepo.count({
      where: { status: 'available' },
    });
    await this.redis.set('stats:vehicles:available', availableVehicles);

    // 活跃用户（今日登录）
    const activeUsers = await this.redis.scard('active_users:today');
    await this.redis.set('stats:users:active', activeUsers);
  }

  /**
   * 获取实时统计
   */
  async getRealTimeStats(): Promise<{
    todayOrders: number;
    todayAmount: number;
    availableVehicles: number;
    activeUsers: number;
  }> {
    const [orders, amount, vehicles, users] = await Promise.all([
      this.redis.get('stats:today:orders'),
      this.redis.get('stats:today:amount'),
      this.redis.get('stats:vehicles:available'),
      this.redis.get('stats:users:active'),
    ]);

    return {
      todayOrders: Number(orders) || 0,
      todayAmount: Number(amount) || 0,
      availableVehicles: Number(vehicles) || 0,
      activeUsers: Number(users) || 0,
    };
  }

  /**
   * 生成数据日报
   */
  async generateDailyReport(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];

    const daily = await this.dailyRepo.findOne({ where: { date } });

    if (!daily) {
      this.logger.warn(`${date} 没有日数据，先生成聚合数据`);
      return;
    }

    // TODO: 调用消息服务发送日报通知
    const report = {
      date,
      summary: {
        orders: daily.newOrders,
        amount: Number(daily.netIncomeCents) / 100,
        users: daily.newUsers,
        utilization: daily.utilizationRate / 100,
      },
      highlights: [],
    };

    this.logger.log(`日报已生成: ${JSON.stringify(report)}`);
  }

  /**
   * 获取Dashboard概览
   */
  async getDashboard(): Promise<{
    today: {
      orders: number;
      amount: number;
      users: number;
      vehicles: number;
    };
    week: {
      orders: number;
      amount: number;
      growth: number;
    };
    month: {
      orders: number;
      amount: number;
      yoyGrowth: number;
      momGrowth: number;
    };
    alerts: number;
  }> {
    // 实时数据
    const realTime = await this.getRealTimeStats();

    // 本周数据
    const now = new Date();
    const week = this.getWeekNumber(now);
    const weekly = await this.weeklyRepo.findOne({
      where: { year: now.getFullYear(), week },
    });

    // 本月数据
    const month = now.getMonth() + 1;
    const monthly = await this.monthlyRepo.findOne({
      where: { year: now.getFullYear(), month },
    });

    // 异常数
    const exceptions = await this.checkOrderExceptions();

    return {
      today: {
        orders: realTime.todayOrders,
        amount: realTime.todayAmount,
        users: realTime.activeUsers,
        vehicles: realTime.availableVehicles,
      },
      week: {
        orders: weekly?.newOrders || 0,
        amount: Number(weekly?.netIncomeCents || 0),
        growth: (weekly?.orderGrowthRate || 0) / 100,
      },
      month: {
        orders: monthly?.newOrders || 0,
        amount: Number(monthly?.netIncomeCents || 0),
        yoyGrowth: (monthly?.incomeYoYGrowth || 0) / 100,
        momGrowth: (monthly?.incomeMoMGrowth || 0) / 100,
      },
      alerts: exceptions.length,
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}