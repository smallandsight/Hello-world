import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Like, Between, LessThan, MoreThan } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Store } from './entities/store.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import {
  PricingRuleDto,
  CalculatePriceDto,
  PriceCalculationResult,
} from './dto/pricing-rule.dto';

/** 维保类型枚举 */
export enum MaintenanceType {
  /** 例行保养（定期） */
  ROUTINE = 'routine',
  /** 故障维修 */
  REPAIR = 'repair',
  /** 事故修复 */
  ACCIDENT = 'accident',
  /** 年检 */
  INSPECTION = 'inspection',
  /** 轮胎更换 */
  TIRE_REPLACE = 'tire_replace',
  /** 电池更换（电动车专用） */
  BATTERY_REPLACE = 'battery_replace',
  /** 清洁消毒 */
  CLEANING = 'cleaning',
  /** 其他 */
  OTHER = 'other',
}

/** 维保状态枚举 */
export enum MaintenanceStatus {
  PENDING = 'pending',       // 待处理
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled',   // 已取消
}

/** 维保记录DTO */
export interface MaintenanceRecordDto {
  id?: number;
  vehicleId: number;
  type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;              // 维保标题，如"5000公里例行保养"
  description?: string;       // 详细描述
  costCents?: number;         // 费用（分）
  partsUsed?: string;         // 使用配件（JSON字符串）
  beforeOdometer?: number;    // 进厂里程
  afterOdometer?: number;     // 出厂里程
  technicianName?: string;    // 技师姓名
  photos?: string;            // 照片URL列表（JSON数组）
  startedAt?: Date;           // 开始时间
  completedAt?: Date;         // 完成时间
  nextMaintenanceAt?: Date;   // 下次维保提醒时间
  nextMaintenanceKm?: number;  // 下次维保里程提醒
  createdBy?: number;         // 创建人ID
}

/** 维保统计信息 */
export interface MaintenanceStats {
  totalRecords: number;
  pendingCount: number;
  inProgressCount: number;
  completedThisMonth: number;
  avgCostPerVehicle: number;
  vehiclesDueForMaintenance: Array<{
    vehicleId: number;
    plateNumber: string;
    daysSinceLastMaint: number;
    reason: string;
  }>;
}

/**
 * 会员等级折扣配置
 * 等级 → (积分倍率, 折扣比例)
 */
const MEMBER_LEVEL_DISCOUNTS: Record<number, { multiplier: number; discount: number }> = {
  1: { multiplier: 1.0, discount: 1.0 },     // 普通会员 — 无折扣
  2: { multiplier: 1.2, discount: 0.95 },    // 银卡 — 95折
  3: { multiplier: 1.5, discount: 0.90 },    // 金卡 — 9折
  4: { multiplier: 2.0, discount: 0.85 },    // 钻石 — 85折
};

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
  ) {}

  // ==================== 车辆查询 ====================

  /**
   * 获取附近可用车辆（LBS 查询）
   */
  async getNearbyVehicles(query: {
    page?: number;
    size?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    // TODO: 实现基于经纬度的附近车辆查询
    return { message: '待实现：附近车辆列表', query };
  }

  /**
   * 车辆详情
   */
  async getVehicleDetail(vehicleId: number) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
      relations: ['store', 'model', 'images'],
    });
    return vehicle || null;
  }

  /**
   * 车型列表（仅上架的）
   */
  async getModelList() {
    return this.modelRepo.find({ where: { isActive: 1 }, order: { sortOrder: 'ASC' } });
  }

  /**
   * 门店列表
   */
  async getStores(query: { page?: number; size?: number; lat?: number; lng?: number }) {
    return this.storeRepo.find({
      where: { isActive: 1 },
      take: query.size || 20,
      skip: ((query.page || 1) - 1) * (query.size || 20),
      order: { sortOrder: 'ASC' },
    });
  }

  // ==================== 定价规则管理 (T3W9-4) ====================

  /** 内存缓存定价规则（生产环境应使用Redis）*/
  private pricingRulesCache: Map<number, PricingRuleDto> = new Map();

  /**
   * 获取所有车型的定价规则
   * 返回按车型ID索引的规则Map
   */
  async getPricingRules(): Promise<PricingRuleDto[]> {
    const models = await this.modelRepo.find({ where: { isActive: 1 } });

    const rules: PricingRuleDto[] = models.map((model) => ({
      modelId: model.id,
      basePricePerHour: (model as any).basePricePerHour || model.dailyRateCents ? Math.round((model.dailyRateCents / 100) / 24) : 20,
      weekdayFactor: (model as any).weekdayFactor || 1.0,
      weekendFactor: (model as any).weekendFactor || 1.2,
      holidayFactor: (model as any).holidayFactor || 1.5,
      peakSeasonFactor: (model as any).peakSeasonFactor || 1.3,
      dailyCap: (model as any).dailyCap || null,
      minRentalHours: (model as any).minRentalHours || 1,
    }));

    return rules;
  }

  /**
   * 获取单个车型的定价规则
   */
  async getPricingRuleByModel(modelId: number): Promise<PricingRuleDto | null> {
    const cached = this.pricingRulesCache.get(modelId);
    if (cached) return cached;

    const model = await this.modelRepo.findOneBy({ id: modelId, isActive: 1 });
    if (!model) throw new NotFoundException('车型不存在');

    const rule: PricingRuleDto = {
      modelId: model.id,
      basePricePerHour: (model as any).basePricePerHour || 20,
      weekdayFactor: (model as any).weekdayFactor || 1.0,
      weekendFactor: (model as any).weekendFactor || 1.2,
      holidayFactor: (model as any).holidayFactor || 1.5,
      peakSeasonFactor: (model as any).peakSeasonFactor || 1.3,
      dailyCap: (model as any).dailyCap || null,
      minRentalHours: (model as any).minRentalHours || 1,
    };

    this.pricingRulesCache.set(modelId, rule);
    return rule;
  }

  /**
   * 批量更新定价规则
   * 将规则写入 vehicle_model 表或独立的pricing_rule表
   */
  async updatePricingRules(rules: PricingRuleDto[]): Promise<{
    updated: number;
    errors: Array<{ modelId: number; error: string }>;
  }> {
    let updated = 0;
    const errors: Array<{ modelId: number; error: string }> = [];

    for (const rule of rules) {
      try {
        const model = await this.modelRepo.findOneBy({ id: rule.modelId });
        if (!model) {
          errors.push({ modelId: rule.modelId, error: '车型不存在' });
          continue;
        }

        // 更新车型表中的价格相关字段
        await this.modelRepo.update(rule.modelId, {
          basePricePerHour: rule.basePricePerHour,
          weekdayFactor: rule.weekdayFactor,
          weekendFactor: rule.weekendFactor,
          holidayFactor: rule.holidayFactor,
          peakSeasonFactor: rule.peakSeasonFactor,
          dailyCap: rule.dailyCap,
          minRentalHours: rule.minRentalHours,
        } as any);

        // 清除缓存
        this.pricingRulesCache.delete(rule.modelId);
        updated++;
      } catch (e) {
        errors.push({ modelId: rule.modelId, error: (e as Error).message });
      }
    }

    return { updated, errors };
  }

  // ==================== 价格试算引擎 (T3W9-4) ====================

  /**
   * 核心试算方法：根据取还车时间、会员等级、优惠券计算最终价格
   *
   * 计算逻辑：
   * 1. 计算租期小时数
   * 2. 按时段分段计算基础费用（工作日/周末/节假日系数不同）
   * 3. 应用会员折扣
   * 4. 扣减优惠券金额
   * 5. 日租封顶校验
   */
  async calculatePricing(dto: CalculatePriceDto): Promise<PriceCalculationResult> {
    const rule = await this.getPricingRuleByModel(dto.vehicleModelId);
    if (!rule) throw new NotFoundException('该车型定价规则不存在');

    const pickupTime = new Date(dto.pickupTime);
    const returnTime = new Date(dto.returnTime);

    if (returnTime <= pickupTime) {
      throw new Error('还车时间必须晚于取车时间');
    }

    const totalMs = returnTime.getTime() - pickupTime.getTime();
    let rentalHours = totalMs / (1000 * 60 * 60);
    rentalHours = Math.max(rentalHours, rule.minRentalHours!);

    // 向上取整到半小时
    rentalHours = Math.ceil(rentalHours * 2) / 2;

    // 时段系数判定
    const timeFactor = this.getTimeFactor(pickupTime, returnTime, rule);
    const memberConfig =
      MEMBER_LEVEL_DISCOUNTS[dto.memberLevel || 1] ||
      MEMBER_LEVEL_DISCOUNTS[1];

    // 基础费用 = 小时数 × 单价 × 时段系数
    let baseFareCents = Math.round(
      rentalHours * rule.basePricePerHour * 100 * timeFactor,
    );

    // 日租金封顶检查
    if (rule.dailyCap && rule.dailyCap > 0) {
      const days = rentalHours / 24;
      const maxFareCents = days * rule.dailyCap * 100;
      if (baseFareCents > maxFareCents) {
        baseFareCents = maxFareCents;
      }
    }

    // 会员优惠
    const beforeMemberDiscount = baseFareCents;
    const memberDiscountCents = Math.round(
      baseFareCents * (1 - memberConfig.discount),
    );
    const afterMemberCents = baseFareCents - memberDiscountCents;

    // 券抵扣
    const couponDiscountCents = dto.couponDiscountCents || 0;
    const finalFareCents = Math.max(0, afterMemberCents - couponDiscountCents);

    return {
      vehicleModelId: dto.vehicleModelId,
      pickupTime: dto.pickupTime,
      returnTime: dto.returnTime,
      rentalHours,
      baseFareCents: beforeMemberDiscount,
      timeFactor,
      memberDiscountRate: memberConfig.discount,
      memberDiscountCents,
      couponDiscountCents,
      totalFareCents: finalFareCents,
      priceBreakdown: [
        {
          period: 'total',
          hours: rentalHours,
          rate: rule.basePricePerHour * timeFactor,
          subtotalCents: beforeMemberDiscount,
        },
      ],
    };
  }

  /**
   * 根据取还车时间段确定综合系数
   *
   * 规则：
   * - 跨越多时段时取加权平均
   * - 法定节假日优先级最高
   * - 其次周末
   * - 默认工作日
   */
  private getTimeFactor(
    pickup: Date,
    ret: Date,
    rule: PricingRuleDto,
  ): number {
    const dayOfWeek = pickup.getDay(); // 0=周日, 6=周六

    // 简化版：主要看是否跨周末/节假日
    // TODO: 接入节假日数据库后可精确判断每一天的系数
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const isWeekendRet = ret.getDay() === 0 || ret.getDay() === 5 || ret.getDay() === 6;

    if (isWeekendDay && isWeekendRet && rule.weekendFactor) {
      return rule.weekendFactor;
    }
    if (!isWeekendDay && !isWeekendRet && rule.weekdayFactor !== undefined) {
      return rule.weekdayFactor!;
    }
    // 混合情况取平均
    return (
      ((rule.weekdayFactor || 1.0) + (rule.weekendFactor || 1.2)) / 2
    );
  }

  /**
   * 获取会员等级折扣信息
   */
  static getMemberDiscount(level: number): {
    levelName: string;
    multiplier: number;
    discount: number;
    label: string;
  } {
    const config = MEMBER_LEVEL_DISCOUNTS[level] || MEMBER_LEVEL_DISCOUNTS[1];
    const names: Record<number, string> = {
      1: '普通会员',
      2: '银卡会员',
      3: '金卡会员',
      4: '钻石会员',
    };

    return {
      levelName: names[level] || '普通会员',
      multiplier: config.multiplier,
      discount: config.discount,
      label:
        config.discount < 1
          ? `${Math.round((1 - config.discount) * 100)}折`
          : '无折扣',
    };
  }

  // ==================== 维保记录管理 (T3W14-2) ====================

  private readonly logger = new Logger(VehicleService.name);

  /**
   * 创建维保记录
   */
  async createMaintenanceRecord(dto: MaintenanceRecordDto): Promise<MaintenanceRecordDto> {
    // 校验车辆存在
    const vehicle = await this.vehicleRepo.findOneBy({ id: dto.vehicleId });
    if (!vehicle) throw new NotFoundException(`车辆不存在: ${dto.vehicleId}`);

    const record = {
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`[Maintenance] 创建维保记录 vehicle=${dto.vehicleId} type=${dto.type}`);

    // TODO: 实际写入 maintenance_records 表
    return record as MaintenanceRecordDto;
  }

  /**
   * 更新维保记录状态和内容
   */
  async updateMaintenanceRecord(
    recordId: number,
    updates: Partial<MaintenanceRecordDto>,
  ): Promise<MaintenanceRecordDto> {
    this.logger.log(`[Maintenance] 更新记录 ${recordId} status=${updates.status}`);
    
    const updated = {
      ...updates,
      updatedAt: new Date(),
    };

    // 如果标记完成，自动计算下次维保时间
    if (updates.status === MaintenanceStatus.COMPLETED && !updates.nextMaintenanceAt) {
      updates.nextMaintenanceAt = this.calculateNextMaintenanceDate(updates.type);
    }

    return updated as unknown as MaintenanceRecordDto;
  }

  /**
   * 查询车辆的维保历史
   */
  async getVehicleMaintenanceHistory(params: {
    vehicleId: number;
    status?: MaintenanceStatus;
    type?: MaintenanceType;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<{ list: MaintenanceRecordDto[]; total: number }> {
    // TODO: 实际查询 maintenance_records 表
    this.logger.log(`[Maintenance] 查询车辆 ${params.vehicleId} 的维保历史`);

    return { list: [], total: 0 };
  }

  /**
   * 获取所有待处理/进行中的维保工单
   */
  async getActiveMaintenanceWorkOrders(): Promise<MaintenanceRecordDto[]> {
    // 返回 status 为 pending 或 in_progress 的记录
    // 按紧急程度排序：accident > repair > routine
    this.logger.log(`[Maintenance] 查询活跃维保工单`);
    return [];
  }

  /**
   * 维保统计仪表盘数据
   */
  async getMaintenanceStats(dateRange?: { start: Date; end: Date }): Promise<MaintenanceStats> {
    // TODO: 实际从数据库聚合统计
    return {
      totalRecords: 0,
      pendingCount: 0,
      inProgressCount: 0,
      completedThisMonth: 0,
      avgCostPerVehicle: 0,
      vehiclesDueForMaintenance: [],
    };
  }

  /**
   * 批量检查车辆是否到期需要维保
   * 基于以下规则触发提醒：
   * - 距上次例行保养超过3000km或90天
   * - 距上次轮胎更换超过20000km或12个月
   * - 车辆有未完成的故障报告
   */
  async checkVehiclesDueForMaintenance(): Promise<{
    dueList: Array<{ vehicleId: number; reason: string; overdueBy: number }>;
  }> {
    const allVehicles = await this.vehicleRepo.find({
      where: { status: 1 }, // 仅在营车辆
    });

    const dueList: Array<{ vehicleId: number; reason: string; overdueBy: number }> = [];

    for (const v of allVehicles) {
      // TODO: 从maintenance_records表查询该车的最近一次维保
      // 这里简化为基于车辆创建时间的模拟逻辑
      const lastMaintDays = Math.floor(
        (Date.now() - (v.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
      );

      if (lastMaintDays > 90) {
        dueList.push({
          vehicleId: v.id,
          reason: `超过${lastMaintDays}天未做例行保养`,
          overdueBy: lastMaintDays - 90,
        });
      }
    }

    return { dueList };
  }

  /**
   * 计算下次建议维保日期
   */
  private calculateNextMaintenanceDate(type: MaintenanceType): Date {
    const now = new Date();
    switch (type) {
      case MaintenanceType.ROUTINE:
        // 例行保养：每3个月或每5000km
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case MaintenanceType.TIRE_REPLACE:
        // 轮胎：12个月后检查
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case MaintenanceType.INSPECTION:
        // 年检：12个月后
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case MaintenanceType.BATTERY_REPLACE:
        // 电池：2-3年后评估
        return new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);
      default:
        // 其他：1个月后检查
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * 导出维保报表（Excel格式）
   */
  async exportMaintenanceReport(params: {
    startDate: Date;
    endDate: Date;
    vehicleIds?: number[];
    types?: MaintenanceType[];
  }): Promise<string> {
    // TODO: 使用 xlsx skill 或类似库生成 Excel 文件
    // 返回文件下载路径或OSS URL
    this.logger.log(`[Maintenance] 导出报表 ${params.startDate.toISOString()} ~ ${params.endDate.toISOString()}`);
    return '';
  }

  /**
   * 根据订单反馈自动创建故障维修工单
   * 用户还车后如果选择了"车辆有问题"并填写描述，系统应自动创建维修记录
   */
  async createRepairFromOrderFeedback(params: {
    orderId: number;
    vehicleId: number;
    userId: number;
    issueDescription: string;
    photos?: string[];
  }): Promise<MaintenanceRecordDto> {
    return this.createMaintenanceRecord({
      vehicleId: params.vehicleId,
      type: MaintenanceType.REPAIR,
      status: MaintenanceStatus.PENDING,
      title: `订单#${params.orderId} 反馈问题`,
      description: params.issueDescription,
      photos: params.photos ? JSON.stringify(params.photos) : undefined,
      createdBy: params.userId,
    });
  }
}

// ==================== 维保记录 Entity 定义 ====================

/** 
 * 维保记录数据库实体 
 * 对应表：maintenance_records
 * 注意：实际使用时应放在 entities 目录下
 */
export class MaintenanceRecordEntity {
  id: number;
  vehicleId: number;
  type: string;
  status: string;
  title: string;
  description?: string;
  costCents?: number;
  partsUsed?: string;
  beforeOdometer?: number;
  afterOdometer?: number;
  technicianName?: string;
  photos?: string;
  startedAt?: Date;
  completedAt?: Date;
  nextMaintenanceAt?: Date;
  nextMaintenanceKm?: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}
