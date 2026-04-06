import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import {
  Repository,
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

const logger = new Logger('AdminService');
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleModel } from '../vehicle/entities/vehicle-model.entity';
import { Store } from '../vehicle/entities/store.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { OrderStatus, ORDER_STATUS_LABELS } from '../../shared/types/order.types';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  // ==================== 仪表盘 ====================

  /**
   * 仪表盘统计数据
   * 今日订单数 / 今日收入 / 车辆总数（各状态） / 用户总数
   */
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 并行查询所有统计
    const [
      todayOrders,
      todayRevenue,
      totalVehicles,
      availableVehicles,
      rentingVehicles,
      maintenanceVehicles,
      totalUsers,
      newUsersToday,
      pendingOrders,
    ] = await Promise.all([
      // 今日订单数
      this.orderRepo.count({
        where: { createdAt: Between(today, tomorrow) as any },
      }),
      // 今日收入（已支付订单的金额汇总）
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount_cents), 0)', 'total')
        .where('p.status = 2')
        .andWhere('p.paid_at >= :today', { today })
        .andWhere('p.paid_at < :tomorrow', { tomorrow })
        .getRawOne(),
      // 车辆统计
      this.vehicleRepo.count({ where: { isActive: 1 } }),
      this.vehicleRepo.count({ where: { status: 1, isActive: 1 } }), // 空闲
      this.vehicleRepo.count({ where: { status: 2, isActive: 1 } }), // 使用中
      this.vehicleRepo.count({ where: { status: 3, isActive: 1 } }), // 维护中
      // 用户统计
      this.userRepo.count(),
      this.userRepo.count({
        where: { createdAt: Between(today, tomorrow) as any },
      }),
      // 待处理订单（待支付+待取车）
      this.orderRepo.count({
        where: [
          { status: OrderStatus.PENDING_PAYMENT },
          { status: OrderStatus.PICKUP_PENDING },
          { status: OrderStatus.RETURN_PENDING },
        ],
      }),
    ]);

    return {
      today: {
        orders: todayOrders,
        revenueCents: parseInt(todayRevenue?.total || '0', 10),
        newUsers: newUsersToday,
        pendingOrders,
      },
      vehicles: {
        total: totalVehicles,
        available: availableVehicles,
        renting: rentingVehicles,
        maintenance: maintenanceVehicles,
      },
      users: {
        total: totalUsers,
      },
      recentTrend: await this.getRecentTrend(7),
    };
  }

  /**
   * 最近N天趋势数据
   */
  async getRecentTrend(days: number) {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [orders, revenue] = await Promise.all([
        this.orderRepo.count({
          where: { createdAt: Between(date, nextDate) as any },
        }),
        this.paymentRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount_cents), 0)', 'total')
          .where('p.status = 2 AND p.paid_at >= :d1 AND p.paid_at < :d2', {
            d1: date,
            d2: nextDate,
          })
          .getRawOne(),
      ]);

      result.push({
        date: date.toISOString().substring(0, 10),
        orders,
        revenueCents: parseInt(revenue?.total || '0', 10),
      });
    }
    return result;
  }

  // ==================== 车辆管理 CRUD ====================

  async getVehicleList(query: {
    page?: number;
    size?: number;
    status?: number;
    storeId?: number;
    modelId?: number;
    keyword?: string;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.vehicleRepo.createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('vehicle.store', 'store')
      .where('vehicle.deleted_at IS NULL');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('vehicle.status = :status', { status: query.status });
    }
    if (query.storeId) {
      qb.andWhere('vehicle.store_id = :storeId', { storeId: query.storeId });
    }
    if (query.modelId) {
      qb.andWhere('vehicle.model_id = :modelId', { modelId: query.modelId });
    }
    if (query.keyword) {
      qb.andWhere(
        '(vehicle.vehicle_no LIKE :kw OR model.model_name LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('vehicle.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  async getVehicleDetail(id: number) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id },
      relations: ['model', 'store', 'images', 'maintenanceRecords'],
    });
    if (!vehicle) throw new NotFoundException('车辆不存在');
    return vehicle;
  }

  async createVehicle(dto: any) {
    const vehicle = this.vehicleRepo.create(dto);
    return this.vehicleRepo.save(vehicle);
  }

  async updateVehicle(id: number, dto: any) {
    const vehicle = await this.vehicleRepo.findOneBy({ id });
    if (!vehicle) throw new NotFoundException('车辆不存在');
    Object.assign(vehicle, dto);
    return this.vehicleRepo.save(vehicle);
  }

  async updateVehicleStatus(id: number, status: number, reason?: string) {
    const vehicle = await this.vehicleRepo.findOneBy({ id });
    if (!vehicle) throw new NotFoundException('车辆不存在');

    await this.vehicleRepo.update(id, { status });

    return {
      message: `车辆状态已更新`,
      vehicleId: id,
      previousStatus: vehicle.status,
      newStatus: status,
      reason,
    };
  }

  // ==================== 车型管理 CRUD ====================

  async getModelList(query: { page?: number; size?: number }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 50, 100);
    const [list, total] = await this.modelRepo.findAndCount({
      order: { sortOrder: 'ASC' as const },
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  async createModel(dto: any) {
    const model = this.modelRepo.create(dto);
    return this.modelRepo.save(model);
  }

  async updateModel(id: number, dto: any) {
    const model = await this.modelRepo.findOneBy({ id });
    if (!model) throw new NotFoundException('车型不存在');
    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  // ==================== 门店管理 CRUD ====================

  async getStoreList(query: { page?: number; size?: number }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const [list, total] = await this.storeRepo.findAndCount({
      order: { sortOrder: 'ASC' as const },
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  async createStore(dto: any) {
    const store = this.storeRepo.create(dto);
    return this.storeRepo.save(store);
  }

  async updateStore(id: number, dto: any) {
    const store = await this.storeRepo.findOneBy({ id });
    if (!store) throw new NotFoundException('门店不存在');
    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  // ==================== 订单管理 ====================

  async getOrderList(query: {
    page?: number;
    size?: number;
    status?: number;
    userId?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('order.store', 'store')
      .where('order.deleted_at IS NULL');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.userId) {
      qb.andWhere('order.user_id = :userId', { userId: query.userId });
    }
    if (query.keyword) {
      qb.andWhere(
        '(order.order_no LIKE :kw OR user.nickname LIKE :kw OR user.phone LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.startDate) {
      qb.andWhere('order.created_at >= :start', {
        start: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      qb.andWhere('order.created_at <= :end', {
        end: new Date(query.endDate + 'T23:59:59.999Z'),
      });
    }

    const [list, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  async getOrderDetail(id: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'vehicle',
        'vehicle.model',
        'vehicle.store',
        'store',
        'payments',
        'logs',
      ],
    });
    if (!order) throw new NotFoundException('订单不存在');
    return {
      ...order,
      statusLabel: ORDER_STATUS_LABELS[order.status],
    };
  }

  /**
   * 管理员手动调整订单状态（谨慎使用）
   */
  async updateOrderStatus(id: number, newStatus: number, remark?: string) {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new NotFoundException('订单不存在');

    const prevStatus = order.status;

    await this.orderRepo.update(id, {
      status: newStatus,
    });

    // 记录日志（通过 OrderLog）
    // 注意：此处直接操作数据库避免循环依赖
    return {
      message: '订单状态已手动调整',
      orderId: id,
      previousStatus: prevStatus,
      previousStatusLabel: ORDER_STATUS_LABELS[prevStatus],
      newStatus,
      newStatusLabel:
        ORDER_STATUS_LABELS[newStatus as OrderStatus] ||
        `未知(${newStatus})`,
      remark,
      operator: 'admin_manual',
      warning: '管理员手动调整状态，请确认业务影响',
    };
  }

  // ==================== 用户管理 ====================

  async getUserList(query: {
    page?: number;
    size?: number;
    status?: number;
    keyword?: string;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.userRepo.createQueryBuilder('user').where(
      'user.deleted_at IS NULL',
    );

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.keyword) {
      qb.andWhere(
        '(user.phone LIKE :kw OR user.nickname LIKE :kw OR user.name LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    // 脱敏处理：隐藏身份证号等敏感字段
    const safeList = list.map((u) => {
      const { idCard, ...rest } = u;
      return rest;
    });

    return {
      list: safeList,
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  async getUserDetail(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['driverLicense', 'userLevel'],
    });
    if (!user) throw new NotFoundException('用户不存在');
    // 脱敏
    const { idCard, ...safeUser } = user as any;
    safeUser.phone = this.maskPhone(safeUser.phone);
    return safeUser;
  }

  /**
   * 封禁/解封用户
   */
  async updateUserStatus(
    id: number,
    status: number,
    reason?: string,
  ) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('用户不存在');

    await this.userRepo.update(id, { status });

    return {
      message: status === 0 ? '用户已封禁' : '用户已恢复正常',
      userId: id,
      previousStatus: user.status,
      newStatus: status,
      reason,
    };
  }

  // ==================== 工具方法 ====================

  /** 手机号脱敏 */
  private maskPhone(phone: string | null): string | null {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  // ==================== 收入统计 (T3W9-3) ====================

  /**
   * 按时间范围查询收入趋势
   * 支持按天/周/月粒度聚合
   */
  async getRevenueStats(query: {
    startDate?: string;
    endDate?: string;
    granularity?: 'day' | 'week' | 'month';
  }) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天
    const endDate = query.endDate ? new Date(query.endDate + 'T23:59:59') : new Date();
    const granularity = query.granularity || 'day';

    // 查询时间范围内所有已支付记录
    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .select([
        "DATE_FORMAT(p.paid_at, '%Y-%m-%d')",
        'date',
        'COALESCE(SUM(p.amount_cents), 0)',
        'revenue',
        'COUNT(p.id)',
        'count',
      ])
      .where('p.status = :status', { status: 2 }) // PAID
      .andWhere('p.paid_at >= :startDate', { startDate })
      .andWhere('p.paid_at <= :endDate', { endDate })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 根据粒度重新分组
    const grouped: Record<string, { revenueCents: number; orderCount: number }> = {};

    for (const row of payments) {
      const dateKey = row.date as string;
      let groupKey: string;

      if (granularity === 'month') {
        groupKey = dateKey.substring(0, 7); // YYYY-MM
      } else if (granularity === 'week') {
        const d = new Date(dateKey);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        groupKey = weekStart.toISOString().substring(0, 10);
      } else {
        groupKey = dateKey; // day
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { revenueCents: 0, orderCount: 0 };
      }
      grouped[groupKey].revenueCents += parseInt(row.revenue || '0', 10);
      grouped[groupKey].orderCount += parseInt(row.count || '0', 10);
    }

    const list = Object.entries(grouped).map(([period, data]) => ({
      period,
      revenueCents: data.revenueCents,
      orderCount: data.orderCount,
    }));

    const totalRevenueCents = list.reduce((sum, item) => sum + item.revenueCents, 0);

    return {
      totalRevenueCents,
      totalOrders: list.reduce((sum, item) => sum + item.orderCount, 0),
      granularity,
      startDate: startDate.toISOString().substring(0, 10),
      endDate: endDate.toISOString().substring(0, 10),
      list,
    };
  }

  // ==================== 对账管理 (T3W9-3) ====================

  /**
   * 对账汇总：系统记录 vs 支付宝实际
   */
  async getReconciliation(query: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
    status?: number;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.order', 'order')
      .where('p.deleted_at IS NULL');

    if (query.startDate) {
      qb.andWhere('p.created_at >= :start', { start: new Date(query.startDate) });
    }
    if (query.endDate) {
      qb.andWhere('p.created_at <= :end', { end: new Date(query.endDate + 'T23:59:59') });
    }
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    const [list, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    // 汇总统计
    const summaryQb = this.paymentRepo.createQueryBuilder('p')
      .select([
        'COUNT(p.id)',
        'totalCount',
        'COALESCE(SUM(CASE WHEN p.status = 2 THEN p.amount_cents ELSE 0 END))',
        'totalPaid',
        'COALESCE(SUM(CASE WHEN p.status = 4 THEN p.refund_amount_cents ELSE 0 END))',
        'totalRefunded',
      ]);

    if (query.startDate) {
      summaryQb.andWhere('p.created_at >= :start', { start: new Date(query.startDate) });
    }
    if (query.endDate) {
      summaryQb.andWhere('p.created_at <= :end', { end: new Date(query.endDate + 'T23:59:59') });
    }

    const summaryRaw = await summaryQb.getRawOne();

    return {
      list,
      total,
      page,
      size,
      pages: Math.ceil(total / size),
      summary: {
        totalCount: parseInt(summaryRaw?.totalCount || '0', 10),
        totalPaidCents: parseInt(summaryRaw?.totalPaid || '0', 10),
        totalRefundedCents: parseInt(summaryRaw?.totalRefunded || '0', 10),
        netIncomeCents:
          parseInt(summaryRaw?.totalPaid || '0', 10) -
          parseInt(summaryRaw?.totalRefunded || '0', 10),
      },
    };
  }

  /**
   * 流水明细列表
   */
  async getPaymentDetailList(query: {
    page?: number;
    size?: number;
    orderId?: number;
    userId?: number;
    paymentNo?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.order', 'order')
      .leftJoinAndSelect('p.user', 'user')
      .where('p.deleted_at IS NULL');

    if (query.orderId) qb.andWhere('p.order_id = :orderId', { orderId: query.orderId });
    if (query.userId) qb.andWhere('p.user_id = :userId', { userId: query.userId });
    if (query.paymentNo) qb.andWhere('p.payment_no LIKE :no', { no: `%${query.paymentNo}%` });
    if (query.startDate) qb.andWhere('p.created_at >= :s', { s: new Date(query.startDate) });
    if (query.endDate) qb.andWhere('p.created_at <= :e', { e: new Date(query.endDate + 'T23:59:59') });

    const [list, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  // ==================== Dashboard 增强 (T3W9-3) ====================

  /**
   * 完整Dashboard数据 — 在原有getDashboardStats基础上扩展
   * 增加会员分布/收入趋势/热门车型/待处理工单数等
   */
  async getFullDashboard() {
    // 获取基础数据
    const baseData = await this.getDashboardStats();

    // 并行获取额外数据
    const [
      memberDistribution,
      topVehicles,
      recentPayments,
      pendingTickets,
    ] = await Promise.all([
      // 会员等级分布
      this.userRepo
        .createQueryBuilder('u')
        .select('u.member_level', 'level')
        .addSelect('COUNT(u.id)', 'count')
        .where('u.status = 1')
        .groupBy('u.member_level')
        .getRawMany(),
      // 热门车辆TOP5（按订单次数）
      this.orderRepo
        .createQueryBuilder('o')
        .select('o.vehicle_id', 'vehicleId')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('AVG(o.total_fare_cents)', 'avgFare')
        .where('o.status IN (:...statuses)', { statuses: [5, 6, 7] }) // 已完成状态
        .groupBy('o.vehicle_id')
        .orderBy('orderCount', 'DESC')
        .limit(5)
        .getRawMany(),
      // 最近10笔支付
      this.paymentRepo.find({
        where: { status: 2 },
        relations: ['order'],
        order: { paidAt: 'DESC' },
        take: 10,
      }),
      // 待处理工单数（如果ticket模块存在则查，否则返回0）
      Promise.resolve(0), // TODO: 关联ticket模块后替换为实际查询
    ]);

    return {
      ...baseData,
      memberDistribution: memberDistribution.map((m: any) => ({
        level: m.level || 0,
        count: parseInt(m.count || '0', 10),
      })),
      topVehicles: topVehicles.map((v: any) => ({
        vehicleId: v.vehicleId,
        orderCount: parseInt(v.orderCount || '0', 10),
        avgFareCents: parseInt(Math.round(v.avgFare || 0), 10),
      })),
      recentPayments,
      pendingTickets,
    };
  }

  // ==================== 审计日志 (T3W14-6) ====================

  /**
   * 记录审计日志（异步，不阻塞主流程）
   */
  async createAuditLog(dto: {
    operatorId: number;
    operatorRole: string;
    action: string;
    targetModule: string;
    targetId?: string;
    detail?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const log = this.auditLogRepo.create({
        ...dto,
        detail: typeof dto.detail === 'object' ? JSON.stringify(dto.detail) : dto.detail,
      });
      await this.auditLogRepo.save(log);
    } catch (error) {
      // 审计日志写入失败不应影响主业务
      logger.error(`[AuditLog] 写入失败: ${error.message}`);
    }
  }

  /**
   * 审计日志分页查询
   */
  async getAuditLogs(query: {
    page?: number;
    size?: number;
    operatorId?: number;
    action?: string;
    targetModule?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.auditLogRepo.createQueryBuilder('log').where(
      '1=1',
    );

    if (query.operatorId) qb.andWhere('log.operator_id = :oid', { oid: query.operatorId });
    if (query.action) qb.andWhere('log.action LIKE :act', { act: `%${query.action}%` });
    if (query.targetModule) qb.andWhere('log.target_module = :mod', { mod: query.targetModule });
    if (query.startDate) qb.andWhere('log.created_at >= :s', { s: new Date(query.startDate) });
    if (query.endDate) qb.andWhere('log.created_at <= :e', { e: new Date(query.endDate + 'T23:59:59') });

    const [list, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    // 解析detail JSON
    const parsedList = list.map((item) => ({
      ...item,
      detail: item.detail ? (typeof item.detail === 'string' ? JSON.parse(item.detail) : item.detail) : null,
    }));

    return { list: parsedList, total, page, size, pages: Math.ceil(total / size) };
  }
}
