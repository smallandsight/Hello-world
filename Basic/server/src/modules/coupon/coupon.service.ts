import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointsRecord } from './entities/points-record.entity';

/** 优惠券状态枚举 */
export const COUPON_STATUS = {
  AVAILABLE: 'available',   // 未使用且未过期
  USED: 'used',            // 已使用
  EXPIRED: 'expired',      // 已过期
} as const;

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(PointsRecord)
    private readonly pointsRecordRepo: Repository<PointsRecord>,
  ) {}

  // ==================== 模板管理（商家端） ====================

  /**
   * 创建优惠券模板
   */
  async createTemplate(dto: {
    name: string;
    code?: string;
    discountType: 'fixed' | 'percent';
    discountValue: number;
    minOrderAmountCents?: number;
    maxDiscountCents?: number;
    scopeType?: 'all' | 'vehicle_type' | 'store';
    scopeValues?: any;
    totalCount?: number;
    perUserLimit?: number;
    validType?: 'fixed' | 'relative';
    validStartAt?: Date;
    validEndAt?: Date;
    validDays?: number;
    description?: string;
  }): Promise<Coupon> {
    // 自动生成唯一编码
    const code = dto.code || this.generateCouponCode();

    // 校验折扣类型与优惠值
    if (dto.discountType === 'percent' && (dto.discountValue < 1 || dto.discountValue > 99)) {
      throw new BadRequestException('折扣券的折扣值需在 1-99 之间');
    }
    if (dto.discountType === 'fixed' && dto.discountValue < 0) {
      throw new BadRequestException('满减券金额不能为负数');
    }

    const template = this.couponRepo.create({
      couponName: dto.name,
      couponCode: code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmountCents: dto.minOrderAmountCents || 0,
      maxDiscountCents: dto.maxDiscountCents || null,
      scopeType: dto.scopeType || 'all',
      scopeValues: dto.scopeValues || null,
      totalCount: dto.totalCount || 0,
      perUserLimit: dto.perUserLimit || 1,
      issuedCount: 0,
      validType: dto.validType || 'relative',
      validStartAt: dto.validStartAt || null,
      validEndAt: dto.validEndAt || null,
      validDays: dto.validDays || 30,
      description: dto.description || '',
      isActive: 1,
    });

    return await this.couponRepo.save(template);
  }

  /**
   * 模板列表（商家端分页查询）
   */
  async listTemplates(query: {
    page?: number;
    size?: number;
    status?: string;
    keyword?: string;
  }): Promise<{
    list: Coupon[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const qb = this.couponRepo.createQueryBuilder('c');

    if (query.status === 'active') {
      qb.andWhere('c.isActive = :active', { active: 1 });
    } else if (query.status === 'inactive') {
      qb.andWhere('c.isActive = :active', { active: 0 });
    }

    if (query.keyword) {
      qb.andWhere(
        '(c.couponName LIKE :kw OR c.couponCode LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip(((query.page || 1) - 1) * (query.size || 20))
      .take(query.size || 20)
      .getManyAndCount();

    return {
      list,
      total,
      page: query.page || 1,
      size: query.size || 20,
      pages: Math.ceil(total / (query.size || 20)),
    };
  }

  /**
   * 更新模板（仅允许在未发放时修改）
   */
  async updateTemplate(
    id: number,
    dto: Partial<{
      name: string;
      description: string;
      isActive: number;
      totalCount: number;
      validEndAt: Date;
    }>,
  ): Promise<Coupon> {
    const template = await this.couponRepo.findOneBy({ id });
    if (!template) throw new NotFoundException('优惠券模板不存在');

    if (template.issuedCount > 0) {
      throw new BadRequestException('该优惠券已发放，不允许修改核心规则');
    }

    Object.assign(template, dto);
    return await this.couponRepo.save(template);
  }

  // ==================== 用户领券/用券 ====================

  /**
   * 用户领取优惠券
   */
  async claimCoupon(
    userId: number,
    templateId: number,
    channel?: string,
  ): Promise<{ success: boolean; message: string; userCouponId: number }> {
    const template = await this.couponRepo.findOneBy({ id: templateId, isActive: 1 });
    if (!template) throw new NotFoundException('优惠券不存在或已下线');

    // 检查发放量上限
    if (template.totalCount > 0 && template.issuedCount >= template.totalCount) {
      throw new ConflictException('优惠券已领完');
    }

    // 检查每人限领数量
    const claimedCount = await this.userCouponRepo.count({
      where: { userId, couponId: templateId },
    });
    if (claimedCount >= template.perUserLimit) {
      throw new ConflictException(`您已领取过此券（限领${template.perUserLimit}张）`);
    }

    // 计算有效期
    let validFrom: Date;
    let validTo: Date;

    if (template.validType === 'fixed') {
      validFrom = template.validStartAt || new Date();
      validTo = template.validEndAt || new Date(Date.now() + 30 * 86400000);
    } else {
      validFrom = new Date();
      validTo = new Date(Date.now() + (template.validDays || 30) * 86400000);
    }

    // 创建用户优惠券记录
    const userCoupon = this.userCouponRepo.create({
      userId,
      couponId: template.id,
      status: 0, // 未使用
      receivedAt: new Date(),
      validFrom,
      validTo,
      source: (channel && ['manual', 'task', 'invite', 'activity'].includes(channel))
        ? (channel as any)
        : 'manual',
    });

    const saved = await this.userCouponRepo.save(userCoupon);

    // 更新已发放计数
    await this.couponRepo.increment({ id: template.id }, 'issuedCount', 1);

    this.logger.log(`用户${userId} 领取了券${template.couponName}`);
    return {
      success: true,
      message: '领取成功',
      userCouponId: saved.id,
    };
  }

  /**
   * 核销优惠券
   * 校验：存在性 → 状态 → 有效期 → 使用门槛
   */
  async useCoupon(
    userId: number,
    userCouponId: number,
    orderId: number,
    orderAmountCents: number,
  ): Promise<{
    success: boolean;
    discountCents: number;
    finalAmountCents: number;
    message: string;
  }> {
    const userCoupon = await this.userCouponRepo.findOne({
      where: { id: userCouponId, userId },
      relations: ['coupon'],
    });
    if (!userCoupon) {
      throw new NotFoundException('该优惠券不在您的账户中');
    }
    if (userCoupon.status === 1) {
      throw new ForbiddenException('该优惠券已被使用');
    }
    if (userCoupon.status === 2) {
      throw new ForbiddenException('该优惠券已过期');
    }

    const now = new Date();
    const { coupon } = userCoupon;

    // 校验有效期
    if (
      (userCoupon.validFrom && now < userCoupon.validFrom) ||
      (userCoupon.validTo && now > userCoupon.validTo)
    ) {
      // 标记为过期
      await this.userCouponRepo.update(userCouponId, { status: 2 });
      throw new ForbiddenException('该优惠券不在有效期内');
    }

    // 计算实际抵扣金额
    let discountCents = 0;
    if (coupon.discountType === 'fixed') {
      // 固定满减：校验门槛
      if (orderAmountCents < (coupon.minOrderAmountCents || 0)) {
        throw new BadRequestException(
          `订单金额不足${((coupon.minOrderAmountCents || 0) / 100).toFixed(2)}元`,
        );
      }
      discountCents = coupon.discountValue;
    } else if (coupon.discountType === 'percent') {
      // 折扣券：计算后封顶
      if (orderAmountCents < (coupon.minOrderAmountCents || 0)) {
        throw new BadRequestException(
          `订单金额不足${((coupon.minOrderAmountCents || 0) / 100).toFixed(2)}元`,
        );
      }
      const rawDiscount = Math.round(orderAmountCents * (coupon.discountValue / 100));
      discountCents = coupon.maxDiscountCents
        ? Math.min(rawDiscount, coupon.maxDiscountCents)
        : rawDiscount;
    }

    // 更新用户券为已使用
    await this.userCouponRepo.update(userCouponId, {
      status: 1,
      usedAt: now,
      orderId,
    });

    const finalAmount = Math.max(0, orderAmountCents - discountCents);

    this.logger.log(`用户${userId} 使用券${userCouponId} 抵扣${discountCents}分 订单${orderId}`);
    return {
      success: true,
      discountCents,
      finalAmountCents: finalAmount,
      message: `优惠券抵扣${(discountCents / 100).toFixed(2)}元`,
    };
  }

  // ==================== 用户券查询 ====================

  /**
   * 我的优惠券列表（三态筛选）
   * @param status available / used / expired / undefined=全部
   */
  async getUserCoupons(
    userId: number,
    status?: string,
    query?: { page?: number; size?: number },
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const page = query?.page || 1;
    const size = query?.size || 20;

    const qb = this.userCouponRepo.createQueryBuilder('uc')
      .leftJoinAndSelect('uc.coupon', 'c')
      .where('uc.userId = :userId', { userId });

    if (status === 'available') {
      qb.andWhere('uc.status = 0')
        .andWhere('(uc.validTo IS NULL OR uc.validTo > NOW())');
    } else if (status === 'used') {
      qb.andWhere('uc.status = 1');
    } else if (status === 'expired') {
      qb.andWhere('(uc.status = 2 OR (uc.status = 0 AND uc.validTo IS NOT NULL AND uc.validTo <= NOW()))');
    }

    const [rawList, total] = await qb
      .orderBy('uc.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    // 格式化输出
    const list = rawList.map((uc) => ({
      id: uc.id,
      couponName: uc.coupon?.couponName,
      discountType: uc.coupon?.discountType,
      discountValue: uc.coupon?.discountValue,
      minOrderAmountCents: uc.coupon?.minOrderAmountCents,
      maxDiscountCents: uc.coupon?.maxDiscountCents,
      status: this.resolveStatus(uc),
      validFrom: uc.validFrom?.toISOString(),
      validTo: uc.validTo?.toISOString(),
      receivedAt: uc.receivedAt?.toISOString(),
      usedAt: uc.usedAt?.toISOString(),
    }));

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  /**
   * 获取指定订单可用的优惠券推荐
   * 返回满足条件（有效期+使用门槛）的所有可用券
   */
  async getAvailableCoupons(
    userId: number,
    amountCents: number,
    vehicleId?: number,
    storeId?: number,
  ): Promise<any[]> {
    const now = new Date();

    const allCoupons = await this.userCouponRepo.find({
      where: { userId, status: 0 },
      relations: ['coupon'],
    });

    const available = allCoupons.filter((uc) => {
      const c = uc.coupon;
      if (!c || c.isActive !== 1) return false;

      // 有效期检查
      if ((uc.validFrom && now < uc.validFrom) || (uc.validTo && now > uc.validTo)) {
        return false;
      }

      // 门槛检查
      if (amountCents < (c.minOrderAmountCents || 0)) {
        return false;
      }

      // 范围检查
      if (c.scopeType !== 'all') {
        const values = Array.isArray(c.scopeValues) ? c.scopeValues : [];
        if (c.scopeType === 'vehicle_type' && vehicleId && !values.includes(vehicleId)) {
          return false;
        }
        if (c.scopeType === 'store' && storeId && !values.includes(storeId)) {
          return false;
        }
      }

      return true;
    });

    // 按"抵扣金额"降序排列（最优惠的在前）
    return available
      .map((uc) => {
        const c = uc.coupon!;
        let estimatedDiscount = 0;
        if (c.discountType === 'fixed') {
          estimatedDiscount = c.discountValue;
        } else {
          const raw = Math.round(amountCents * (c.discountValue / 100));
          estimatedDiscount = c.maxDiscountCents ? Math.min(raw, c.maxDiscountCents) : raw;
        }
        return {
          userCouponId: uc.id,
          couponName: c.couponName,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderAmountCents: c.minOrderAmountCents,
          maxDiscountCents: c.maxDiscountCents,
          estimatedDiscountCents: estimatedDiscount,
          validTo: uc.validTo?.toISOString(),
          description: c.description,
        };
      })
      .sort((a, b) => b.estimatedDiscountCents - a.estimatedDiscountCents);
  }

  // ==================== 新人礼包 ====================

  /**
   * 新用户注册自动发放新人礼包
   * 发放一组预设的新人专属优惠券
   */
  async distributeNewUserPack(userId: number): Promise<{
    issuedCount: number;
    coupons: any[];
  }> {
    // 查找标记为"新人"类型的优惠券模板
    const newbieTemplates = await this.couponRepo.find({
      where: { isActive: 1 },
      order: { createdAt: 'ASC' },
    });

    // 筛选新人专用券（通过名称或描述识别）
    // 实际生产环境建议增加 is_newbie 字段标识
    const packTemplates = newbieTemplates.filter(
      (t) =>
        t.couponCode.includes('NEW') ||
        t.couponName.includes('新') ||
        t.perUserLimit >= 3, // 宽松策略
    );

    // 如果没有找到专门的新人券，取前3张通用券作为礼包
    const toDistribute = packTemplates.length > 0 ? packTemplates.slice(0, 3) : newbieTemplates.slice(0, 3);

    const coupons = [];
    for (const tpl of toDistribute) {
      try {
        const result = await this.claimCoupon(userId, tpl.id, 'activity');
        coupons.push(result);
      } catch (e) {
        // 领取失败不影响其他券
        this.logger.warn(`新人礼包发放失败: ${e.message}`);
      }
    }

    return {
      issuedCount: coupons.length,
      coupons,
    };
  }

  // ==================== 管理端辅助方法 ====================

  async adminList(params: { page: number; pageSize: number; status?: string }) {
    return this.listTemplates({
      page: params.page,
      size: params.pageSize,
      status: params.status,
    });
  }

  async adminGetDetail(id: number): Promise<Coupon> {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw new NotFoundException('优惠券模板不存在');
    return coupon;
  }

  async adminCreate(body: any) {
    return this.createTemplate({
      name: body.name,
      discountType: body.discountType,
      discountValue: body.value,
      minOrderAmountCents: body.minAmount ? body.minAmount * 100 : 0,
      totalCount: body.totalQuantity,
      perUserLimit: body.limitPerUser,
      validStartAt: body.validFrom ? new Date(body.validFrom) : undefined,
      validEndAt: body.validTo ? new Date(body.validTo) : undefined,
    });
  }

  async adminToggleStatus(id: number, enabled: boolean) {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw new NotFoundException('优惠券模板不存在');
    await this.couponRepo.update(id, { isActive: enabled ? 1 : 0 });
    return { enabled };
  }

  async getPointsInfo(userId: number) {
    // 此方法由 PointsService 接管，这里保留兼容接口
    return { message: '请使用 /points/balance 接口获取积分信息' };
  }

  async getPointsHistory(
    userId: number,
    page: number,
    pageSize: number,
  ) {
    // 此方法由 PointsService 接管
    return { message: '请使用 /points/records 接口获取积分历史' };
  }

  // ==================== 内部工具 ====================

  /** 解析 UserCoupon 状态为前端友好值 */
  private resolveStatus(uc: UserCoupon): string {
    if (uc.status === 1) return 'used';
    if (uc.status === 2) return 'expired';
    // 状态=0 时还需判断是否已过期
    if (uc.validTo && new Date() > uc.validTo) return 'expired';
    return 'available';
  }

  /** 生成唯一优惠券编码 */
  private generateCouponCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CPN${timestamp}${random}`;
  }
}
