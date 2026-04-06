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
import { Vehicle, VehicleStatus } from '../vehicle/entities/vehicle.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { UserCoupon } from '../coupon/entities/user-coupon.entity';
import { PointsRecord } from '../coupon/entities/points-record.entity';

/**
 * ETL服务 - 数据抽取、转换、加载
 * 负责从业务表抽取数据，进行聚合计算，写入分析表
 */
@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

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
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(UserCoupon)
    private userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(PointsRecord)
    private pointsRecordRepo: Repository<PointsRecord>,
    @InjectRedis() private redis: Redis,
  ) {}

  /**
   * 执行每日数据聚合
   * @param date 目标日期，默认昨天
   */
  async aggregateDaily(date?: string): Promise<AnalyticsDaily> {
    const targetDate = date || this.getYesterday();
    const startOfDay = new Date(`${targetDate} 00:00:00`);
    const endOfDay = new Date(`${targetDate} 23:59:59`);

    this.logger.log(`开始聚合 ${targetDate} 的数据...`);

    // 检查是否已存在
    let daily = await this.dailyRepo.findOne({ where: { date: targetDate } });
    if (!daily) {
      daily = this.dailyRepo.create({ date: targetDate });
    }

    // 1. 用户指标
    await this.aggregateUserMetrics(daily, startOfDay, endOfDay);

    // 2. 订单指标
    await this.aggregateOrderMetrics(daily, startOfDay, endOfDay);

    // 3. 车辆指标
    await this.aggregateVehicleMetrics(daily);

    // 4. 收入指标
    await this.aggregateIncomeMetrics(daily, startOfDay, endOfDay);

    // 5. 支付指标
    await this.aggregatePaymentMetrics(daily, startOfDay, endOfDay);

    // 6. 营销指标
    await this.aggregateMarketingMetrics(daily, startOfDay, endOfDay);

    // 7. 客服指标
    await this.aggregateTicketMetrics(daily, startOfDay, endOfDay);

    // 8. 门店维度
    await this.aggregateStoreMetrics(daily, startOfDay, endOfDay);

    // 9. 车型维度
    await this.aggregateModelMetrics(daily, startOfDay, endOfDay);

    // 保存
    const result = await this.dailyRepo.save(daily);

    // 清除缓存
    await this.clearAnalyticsCache('daily', targetDate);

    this.logger.log(`${targetDate} 数据聚合完成`);
    return result;
  }

  /**
   * 执行每周数据聚合
   * @param year 年份
   * @param week 周数
   */
  async aggregateWeekly(year?: number, week?: number): Promise<AnalyticsWeekly> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetWeek = week || this.getWeekNumber(now) - 1; // 上周

    const { startDate, endDate } = this.getWeekRange(targetYear, targetWeek);

    this.logger.log(`开始聚合 ${targetYear}年第${targetWeek}周 的数据...`);

    // 检查是否已存在
    let weekly = await this.weeklyRepo.findOne({
      where: { year: targetYear, week: targetWeek },
    });
    if (!weekly) {
      weekly = this.weeklyRepo.create({
        year: targetYear,
        week: targetWeek,
        startDate,
        endDate,
      });
    }

    // 获取该周的所有日数据
    const dailyRecords = await this.dailyRepo.find({
      where: {
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    if (dailyRecords.length === 0) {
      this.logger.warn(`该周没有日数据，先执行日聚合`);
      // 按天聚合
      let currentDate = new Date(startDate);
      while (currentDate <= new Date(endDate)) {
        await this.aggregateDaily(this.formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      // 重新获取
      const newDailyRecords = await this.dailyRepo.find({
        where: { date: Between(startDate, endDate) },
      });
      this.calculateWeeklyFromDaily(weekly, newDailyRecords);
    } else {
      this.calculateWeeklyFromDaily(weekly, dailyRecords);
    }

    // 计算环比
    const lastWeek = await this.weeklyRepo.findOne({
      where: { year: targetYear, week: targetWeek - 1 },
    });
    if (lastWeek) {
      const orderGrowth = lastWeek.newOrders > 0
        ? Math.round(((weekly.newOrders - lastWeek.newOrders) / lastWeek.newOrders) * 10000) / 100
        : 0;
      weekly.orderGrowthRate = Math.round(orderGrowth * 100);

      const incomeGrowth = Number(lastWeek.netIncomeCents) > 0
        ? Math.round(((Number(weekly.netIncomeCents) - Number(lastWeek.netIncomeCents)) / Number(lastWeek.netIncomeCents)) * 10000) / 100
        : 0;
      weekly.incomeGrowthRate = Math.round(incomeGrowth * 100);
    }

    const result = await this.weeklyRepo.save(weekly);
    await this.clearAnalyticsCache('weekly', `${targetYear}-${targetWeek}`);

    this.logger.log(`${targetYear}年第${targetWeek}周 数据聚合完成`);
    return result;
  }

  /**
   * 执行每月数据聚合
   * @param year 年份
   * @param month 月份
   */
  async aggregateMonthly(year?: number, month?: number): Promise<AnalyticsMonthly> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth(); // 上月（0-indexed）

    const startDate = this.formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = this.formatDate(new Date(targetYear, targetMonth, 0)); // 月末

    this.logger.log(`开始聚合 ${targetYear}年${targetMonth}月 的数据...`);

    // 检查是否已存在
    let monthly = await this.monthlyRepo.findOne({
      where: { year: targetYear, month: targetMonth },
    });
    if (!monthly) {
      monthly = this.monthlyRepo.create({
        year: targetYear,
        month: targetMonth,
        startDate,
        endDate,
      });
    }

    // 获取该月的所有日数据
    const dailyRecords = await this.dailyRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    if (dailyRecords.length > 0) {
      this.calculateMonthlyFromDaily(monthly, dailyRecords);
    }

    // 计算同比（去年同月）
    const lastYear = await this.monthlyRepo.findOne({
      where: { year: targetYear - 1, month: targetMonth },
    });
    if (lastYear) {
      monthly.userYoYGrowth = this.calculateGrowthRate(monthly.newUsers, lastYear.newUsers);
      monthly.orderYoYGrowth = this.calculateGrowthRate(monthly.newOrders, lastYear.newOrders);
      monthly.incomeYoYGrowth = this.calculateGrowthRate(
        Number(monthly.netIncomeCents),
        Number(lastYear.netIncomeCents),
      );
    }

    // 计算环比（上月）
    const lastMonth = await this.monthlyRepo.findOne({
      where: {
        year: targetMonth === 1 ? targetYear - 1 : targetYear,
        month: targetMonth === 1 ? 12 : targetMonth - 1,
      },
    });
    if (lastMonth) {
      monthly.userMoMGrowth = this.calculateGrowthRate(monthly.newUsers, lastMonth.newUsers);
      monthly.orderMoMGrowth = this.calculateGrowthRate(monthly.newOrders, lastMonth.newOrders);
      monthly.incomeMoMGrowth = this.calculateGrowthRate(
        Number(monthly.netIncomeCents),
        Number(lastMonth.netIncomeCents),
      );
    }

    // 计算用户分群
    await this.calculateUserSegments(monthly);

    // 计算排名
    await this.calculateRankings(monthly, startDate, endDate);

    const result = await this.monthlyRepo.save(monthly);
    await this.clearAnalyticsCache('monthly', `${targetYear}-${targetMonth}`);

    this.logger.log(`${targetYear}年${targetMonth}月 数据聚合完成`);
    return result;
  }

  // ==================== 私有方法 ====================

  private async aggregateUserMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    // 新增用户数
    daily.newUsers = await this.userRepo.count({
      where: { createdAt: Between(start, end) },
    });

    // 活跃用户数（有登录或有操作的用户）
    const activeUserIds = await this.redis.smembers(`active_users:${daily.date}`);
    daily.activeUsers = activeUserIds.length || daily.newUsers;

    // 下单用户数
    const orderUsers = await this.orderRepo
      .createQueryBuilder('order')
      .select('DISTINCT order.userId')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .getRawMany();
    daily.orderUsers = orderUsers.length;

    // 新增会员数（简化统计：有会员等级的用户）
    daily.newMembers = await this.userRepo.count({
      where: {
        createdAt: Between(start, end),
        levelId: MoreThanOrEqual(1),
      },
    });
  }

  private async aggregateOrderMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    // 新增订单
    const newOrders = await this.orderRepo.find({
      where: { createdAt: Between(start, end) },
    });
    daily.newOrders = newOrders.length;

    // 完成订单
    const completedOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.COMPLETED,
        updatedAt: Between(start, end),
      },
    });
    daily.completedOrders = completedOrders.length;

    // 取消订单
    const cancelledOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.CANCELLED,
        updatedAt: Between(start, end),
      },
    });
    daily.cancelledOrders = cancelledOrders.length;

    // 金额计算
    const orderAmount = newOrders.reduce((sum, o) => sum + Number(o.totalAmountCents || 0), 0);
    const paidAmount = newOrders.reduce((sum, o) => sum + Number(o.paidAmountCents || 0), 0);
    const couponDiscount = newOrders.reduce((sum, o) => sum + Number(o.discountAmountCents || 0), 0);

    daily.orderAmountCents = String(orderAmount);
    daily.paidAmountCents = String(paidAmount);
    daily.couponDiscountCents = String(couponDiscount);
    daily.avgOrderAmountCents = daily.newOrders > 0
      ? String(Math.round(orderAmount / daily.newOrders))
      : '0';
  }

  private async aggregateVehicleMetrics(daily: AnalyticsDaily): Promise<void> {
    // 总车辆数
    daily.totalVehicles = await this.vehicleRepo.count({
      withDeleted: false,
    });

    // 可用车辆
    daily.availableVehicles = await this.vehicleRepo.count({
      where: { status: VehicleStatus.AVAILABLE },
    });

    // 出租车辆
    daily.rentedVehicles = await this.vehicleRepo.count({
      where: { status: VehicleStatus.RENTED },
    });

    // 利用率
    daily.utilizationRate = daily.totalVehicles > 0
      ? Math.round((daily.rentedVehicles / daily.totalVehicles) * 10000)
      : 0;
  }

  private async aggregateIncomeMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    // 从支付记录统计收入
    const payments = await this.paymentRepo.find({
      where: {
        createdAt: Between(start, end),
        status: 'success',
      },
    });

    // 分类统计
    daily.rentalIncomeCents = '0';
    daily.insuranceIncomeCents = '0';
    daily.serviceFeeCents = '0';
    daily.otherIncomeCents = '0';
    daily.refundAmountCents = '0';

    for (const p of payments) {
      // 简化处理：按类型分类（实际应从订单明细拆分）
      const amount = Number(p.amountCents || 0);
      if (p.channel === 'rental') {
        daily.rentalIncomeCents = String(Number(daily.rentalIncomeCents) + amount);
      } else if (p.channel === 'insurance') {
        daily.insuranceIncomeCents = String(Number(daily.insuranceIncomeCents) + amount);
      }
    }

    // 净收入
    const totalIncome = Number(daily.rentalIncomeCents) +
      Number(daily.insuranceIncomeCents) +
      Number(daily.serviceFeeCents) +
      Number(daily.otherIncomeCents);
    daily.netIncomeCents = String(totalIncome - Number(daily.refundAmountCents));
  }

  private async aggregatePaymentMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    const payments = await this.paymentRepo.find({
      where: { createdAt: Between(start, end) },
    });

    daily.successPayments = payments.filter(p => p.status === 'success').length;
    daily.failedPayments = payments.filter(p => p.status === 'failed').length;

    const total = daily.successPayments + daily.failedPayments;
    daily.paymentSuccessRate = total > 0
      ? Math.round((daily.successPayments / total) * 10000)
      : 0;
  }

  private async aggregateMarketingMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    // 优惠券使用
    daily.couponUsed = await this.userCouponRepo.count({
      where: {
        status: 'used',
        usedAt: Between(start, end),
      },
    });

    // 优惠券发放
    daily.couponIssued = await this.userCouponRepo.count({
      where: { createdAt: Between(start, end) },
    });

    // 积分
    const pointsRecords = await this.pointsRecordRepo.find({
      where: { createdAt: Between(start, end) },
    });

    daily.pointsIssued = String(
      pointsRecords.filter(r => Number(r.points) > 0).reduce((sum, r) => sum + Number(r.points), 0),
    );
    daily.pointsConsumed = String(
      Math.abs(pointsRecords.filter(r => Number(r.points) < 0).reduce((sum, r) => sum + Number(r.points), 0)),
    );
  }

  private async aggregateTicketMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    daily.newTickets = await this.ticketRepo.count({
      where: { createdAt: Between(start, end) },
    });

    daily.resolvedTickets = await this.ticketRepo.count({
      where: {
        status: 'resolved',
        updatedAt: Between(start, end),
      },
    });

    // 平均响应时间（秒）
    const tickets = await this.ticketRepo.find({
      where: { createdAt: Between(start, end) },
    });
    if (tickets.length > 0) {
      const totalResponseTime = tickets.reduce((sum, t) => {
        if (t.firstReplyAt && t.createdAt) {
          return sum + (new Date(t.firstReplyAt).getTime() - new Date(t.createdAt).getTime()) / 1000;
        }
        return sum;
      }, 0);
      daily.avgResponseTime = Math.round(totalResponseTime / tickets.length);
    }
  }

  private async aggregateStoreMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    // 按门店聚合（简化实现）
    const storeMetrics: Record<string, any> = {};

    const orders = await this.orderRepo.find({
      where: { createdAt: Between(start, end) },
      relations: ['pickupStore'],
    });

    for (const order of orders) {
      const storeId = order.pickupStoreId;
      if (!storeMetrics[storeId]) {
        storeMetrics[storeId] = {
          storeId,
          storeName: order.pickupStore?.name || '未知门店',
          orders: 0,
          amount: 0,
          newUsers: 0,
        };
      }
      storeMetrics[storeId].orders++;
      storeMetrics[storeId].amount += Number(order.totalAmountCents || 0);
    }

    daily.storeMetrics = storeMetrics;
  }

  private async aggregateModelMetrics(
    daily: AnalyticsDaily,
    start: Date,
    end: Date,
  ): Promise<void> {
    const modelMetrics: Record<string, any> = {};

    const orders = await this.orderRepo.find({
      where: { createdAt: Between(start, end) },
      relations: ['vehicle', 'vehicle.model'],
    });

    for (const order of orders) {
      const modelId = order.vehicle?.modelId;
      if (!modelId) continue;

      if (!modelMetrics[modelId]) {
        modelMetrics[modelId] = {
          modelId,
          modelName: order.vehicle?.model?.name || '未知车型',
          orders: 0,
          amount: 0,
          utilizationRate: 0,
        };
      }
      modelMetrics[modelId].orders++;
      modelMetrics[modelId].amount += Number(order.totalAmountCents || 0);
    }

    daily.modelMetrics = modelMetrics;
  }

  private calculateWeeklyFromDaily(weekly: AnalyticsWeekly, dailyRecords: AnalyticsDaily[]): void {
    weekly.newUsers = dailyRecords.reduce((sum, d) => sum + d.newUsers, 0);
    weekly.activeUsers = Math.max(...dailyRecords.map(d => d.activeUsers));
    weekly.newMembers = dailyRecords.reduce((sum, d) => sum + d.newMembers, 0);

    weekly.newOrders = dailyRecords.reduce((sum, d) => sum + d.newOrders, 0);
    weekly.completedOrders = dailyRecords.reduce((sum, d) => sum + d.completedOrders, 0);
    weekly.orderAmountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.orderAmountCents), 0),
    );
    weekly.paidAmountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.paidAmountCents), 0),
    );

    weekly.totalIncomeCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.netIncomeCents), 0),
    );
    weekly.netIncomeCents = weekly.totalIncomeCents;

    weekly.avgUtilizationRate = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.utilizationRate, 0) / dailyRecords.length,
    );
    weekly.avgRentalHours = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.avgRentalHours, 0) / dailyRecords.length,
    );

    weekly.couponUsed = dailyRecords.reduce((sum, d) => sum + d.couponUsed, 0);
    weekly.couponDiscountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.couponDiscountCents), 0),
    );
    weekly.pointsIssued = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.pointsIssued), 0),
    );
    weekly.pointsConsumed = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.pointsConsumed), 0),
    );

    weekly.newTickets = dailyRecords.reduce((sum, d) => sum + d.newTickets, 0);
    weekly.resolvedTickets = dailyRecords.reduce((sum, d) => sum + d.resolvedTickets, 0);
    weekly.avgResponseTime = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.avgResponseTime, 0) / dailyRecords.length,
    );

    weekly.dailyDetails = dailyRecords.map(d => ({
      date: d.date,
      orders: d.newOrders,
      amount: Number(d.orderAmountCents),
      users: d.activeUsers,
    }));
  }

  private calculateMonthlyFromDaily(monthly: AnalyticsMonthly, dailyRecords: AnalyticsDaily[]): void {
    monthly.newUsers = dailyRecords.reduce((sum, d) => sum + d.newUsers, 0);
    monthly.activeUsers = Math.max(...dailyRecords.map(d => d.activeUsers));
    monthly.newMembers = dailyRecords.reduce((sum, d) => sum + d.newMembers, 0);

    monthly.newOrders = dailyRecords.reduce((sum, d) => sum + d.newOrders, 0);
    monthly.completedOrders = dailyRecords.reduce((sum, d) => sum + d.completedOrders, 0);
    monthly.cancelledOrders = dailyRecords.reduce((sum, d) => sum + d.cancelledOrders, 0);
    monthly.orderAmountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.orderAmountCents), 0),
    );
    monthly.paidAmountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.paidAmountCents), 0),
    );
    monthly.avgOrderAmountCents = monthly.newOrders > 0
      ? String(Math.round(Number(monthly.orderAmountCents) / monthly.newOrders))
      : '0';

    monthly.rentalIncomeCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.rentalIncomeCents), 0),
    );
    monthly.insuranceIncomeCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.insuranceIncomeCents), 0),
    );
    monthly.serviceFeeCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.serviceFeeCents), 0),
    );
    monthly.refundAmountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.refundAmountCents), 0),
    );
    monthly.netIncomeCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.netIncomeCents), 0),
    );

    monthly.totalVehicles = dailyRecords[dailyRecords.length - 1]?.totalVehicles || 0;
    monthly.avgUtilizationRate = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.utilizationRate, 0) / dailyRecords.length,
    );
    monthly.maxUtilizationRate = Math.max(...dailyRecords.map(d => d.utilizationRate));
    monthly.avgRentalHours = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.avgRentalHours, 0) / dailyRecords.length,
    );

    monthly.successPayments = dailyRecords.reduce((sum, d) => sum + d.successPayments, 0);
    monthly.failedPayments = dailyRecords.reduce((sum, d) => sum + d.failedPayments, 0);
    monthly.paymentSuccessRate = (monthly.successPayments + monthly.failedPayments) > 0
      ? Math.round((monthly.successPayments / (monthly.successPayments + monthly.failedPayments)) * 10000)
      : 0;

    monthly.couponIssued = dailyRecords.reduce((sum, d) => sum + d.couponIssued, 0);
    monthly.couponUsed = dailyRecords.reduce((sum, d) => sum + d.couponUsed, 0);
    monthly.couponDiscountCents = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.couponDiscountCents), 0),
    );
    monthly.pointsIssued = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.pointsIssued), 0),
    );
    monthly.pointsConsumed = String(
      dailyRecords.reduce((sum, d) => sum + Number(d.pointsConsumed), 0),
    );

    monthly.newTickets = dailyRecords.reduce((sum, d) => sum + d.newTickets, 0);
    monthly.resolvedTickets = dailyRecords.reduce((sum, d) => sum + d.resolvedTickets, 0);
    monthly.avgResponseTime = Math.round(
      dailyRecords.reduce((sum, d) => sum + d.avgResponseTime, 0) / dailyRecords.length,
    );
  }

  private async calculateUserSegments(monthly: AnalyticsMonthly): Promise<void> {
    // 简化版的用户分群统计
    const totalUsers = await this.userRepo.count();

    // 高价值用户（订单金额 > 5000 的用户）
    const highValueUsers = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.userId')
      .addSelect('SUM(order.totalAmountCents)', 'total')
      .groupBy('order.userId')
      .having('total > :threshold', { threshold: 500000 }) // 5000元
      .getRawMany();
    monthly.highValueUsers = highValueUsers.length;

    // 简化估计
    monthly.activeUsersSegment = Math.round(totalUsers * 0.3);
    monthly.dormantUsers = Math.round(totalUsers * 0.4);
    monthly.churnedUsers = Math.round(totalUsers * 0.2);
  }

  private async calculateRankings(
    monthly: AnalyticsMonthly,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    // 门店排名
    const storeStats = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.pickupStore', 'store')
      .select('order.pickupStoreId', 'storeId')
      .addSelect('store.name', 'storeName')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.totalAmountCents)', 'amount')
      .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('order.pickupStoreId')
      .orderBy('amount', 'DESC')
      .limit(10)
      .getRawMany();

    monthly.storeRanking = storeStats.map((s, i) => ({
      storeId: s.storeId,
      storeName: s.storeName || '未知门店',
      orders: Number(s.orders),
      amount: Number(s.amount),
      rank: i + 1,
 }));

    // 车型排名
    const modelStats = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.vehicle', 'vehicle')
      .leftJoin('vehicle.model', 'model')
      .select('vehicle.modelId', 'modelId')
      .addSelect('model.name', 'modelName')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.totalAmountCents)', 'amount')
      .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('vehicle.modelId IS NOT NULL')
      .groupBy('vehicle.modelId')
      .orderBy('amount', 'DESC')
      .limit(10)
      .getRawMany();

    monthly.modelRanking = modelStats.map((m, i) => ({
      modelId: m.modelId,
      modelName: m.modelName || '未知车型',
      orders: Number(m.orders),
      amount: Number(m.amount),
      utilizationRate: 0, // 需要单独计算
      rank: i + 1,
    }));
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 10000);
  }

  private getYesterday(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return this.formatDate(date);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getWeekRange(year: number, week: number): { startDate: string; endDate: string } {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7;
    const firstDayOfWeek = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + daysOffset));
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);

    return {
      startDate: this.formatDate(firstDayOfWeek),
      endDate: this.formatDate(lastDayOfWeek),
    };
  }

  private async clearAnalyticsCache(type: string, key: string): Promise<void> {
    const cacheKey = `analytics:${type}:${key}`;
    await this.redis.del(cacheKey);
  }
}