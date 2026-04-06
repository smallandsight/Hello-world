import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { InjectRedis } from '../../common/redis/redis.module';
import Redis from 'ioredis';
import { Activity, ActivityStatus, ActivityType } from './entities/activity.entity';
import { FlashSale } from './entities/flash-sale.entity';
import { DiscountRule } from './entities/discount-rule.entity';
import { Invitation, InvitationStatus } from './entities/invitation.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { CouponService } from '../coupon/coupon.service';

/**
 * 营销活动服务
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(Activity)
    private activityRepo: Repository<Activity>,
    @InjectRepository(FlashSale)
    private flashSaleRepo: Repository<FlashSale>,
    @InjectRepository(DiscountRule)
    private discountRuleRepo: Repository<DiscountRule>,
    @InjectRepository(Invitation)
    private invitationRepo: Repository<Invitation>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRedis() private redis: Redis,
    private couponService: CouponService,
  ) {}

  // ==================== 活动管理 ====================

  /**
   * 创建活动
   */
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const activity = this.activityRepo.create(data);
    return this.activityRepo.save(activity);
  }

  /**
   * 更新活动
   */
  async updateActivity(id: string, data: Partial<Activity>): Promise<Activity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    Object.assign(activity, data);
    return this.activityRepo.save(activity);
  }

  /**
   * 上架活动
   */
  async activateActivity(id: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    if (activity.status === ActivityStatus.ACTIVE) {
      throw new BadRequestException('活动已上架');
    }

    activity.status = ActivityStatus.ACTIVE;
    return this.activityRepo.save(activity);
  }

  /**
   * 下架活动
   */
  async deactivateActivity(id: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    activity.status = ActivityStatus.INACTIVE;
    return this.activityRepo.save(activity);
  }

  /**
   * 获取活动列表（管理端）
   */
  async getActivities(options?: {
    type?: ActivityType;
    status?: ActivityStatus;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Activity[]; total: number }> {
    const { type, status, page = 1, pageSize = 20 } = options || {};

    const query = this.activityRepo.createQueryBuilder('activity');

    if (type) {
      query.andWhere('activity.type = :type', { type });
    }

    if (status) {
      query.andWhere('activity.status = :status', { status });
    }

    query.orderBy('activity.sort', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await query.getManyAndCount();

    return { list, total };
  }

  /**
   * 获取用户端活动列表
   */
  async getActiveActivities(userId?: string): Promise<Activity[]> {
    const now = new Date();

    const activities = await this.activityRepo.find({
      where: {
        status: ActivityStatus.ACTIVE,
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
      },
      order: { sort: 'DESC', createdAt: 'DESC' },
    });

    // 检查用户是否符合参与条件
    if (userId) {
      return activities.filter(async (activity) => {
        return await this.checkUserEligibility(activity, userId);
      });
    }

    return activities;
  }

  /**
   * 获取活动详情
   */
  async getActivityDetail(id: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    // 如果是限时特价，加载特价商品
    if (activity.type === ActivityType.FLASH_SALE) {
      const flashSales = await this.flashSaleRepo.find({
        where: { activityId: id, isActive: true },
      });
      (activity as any).flashSales = flashSales;
    }

    return activity;
  }

  // ==================== 限时特价 ====================

  /**
   * 创建限时特价配置
   */
  async createFlashSale(data: Partial<FlashSale>): Promise<FlashSale> {
    // 检查是否已存在
    const existing = await this.flashSaleRepo.findOne({
      where: { activityId: data.activityId, modelId: data.modelId },
    });

    if (existing) {
      throw new BadRequestException('该车型已配置特价');
    }

    // 计算折扣比例
    const originalPrice = Number(data.originalPriceCents);
    const specialPrice = Number(data.specialPriceCents);
    const discountRatio = Math.round((specialPrice / originalPrice) * 100);

    const flashSale = this.flashSaleRepo.create({
      ...data,
      discountRatio,
    });

    return this.flashSaleRepo.save(flashSale);
  }

  /**
   * 获取限时特价列表
   */
  async getFlashSales(activityId: string): Promise<FlashSale[]> {
    return this.flashSaleRepo.find({
      where: { activityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 检查限时特价库存
   */
  async checkFlashSaleStock(flashSaleId: string, quantity: number = 1): Promise<boolean> {
    const flashSale = await this.flashSaleRepo.findOne({ where: { id: flashSaleId } });
    if (!flashSale) {
      return false;
    }

    return flashSale.stock - flashSale.soldCount >= quantity;
  }

  /**
   * 扣减限时特价库存（原子操作）
   */
  async deductFlashSaleStock(flashSaleId: string, quantity: number = 1): Promise<boolean> {
    const result = await this.flashSaleRepo
      .createQueryBuilder()
      .update(FlashSale)
      .set({
        soldCount: () => 'sold_count + :quantity',
      })
      .where('id = :id AND stock - sold_count >= :quantity', {
        id: flashSaleId,
        quantity,
      })
      .execute();

    return result.affected > 0;
  }

  // ==================== 满减规则 ====================

  /**
   * 创建满减规则
   */
  async createDiscountRule(data: Partial<DiscountRule>): Promise<DiscountRule> {
    const rule = this.discountRuleRepo.create(data);
    return this.discountRuleRepo.save(rule);
  }

  /**
   * 获取满减规则列表
   */
  async getDiscountRules(options?: { status?: boolean }): Promise<DiscountRule[]> {
    const query = this.discountRuleRepo.createQueryBuilder('rule');

    if (options?.status !== undefined) {
      query.andWhere('rule.status = :status', { status: options.status });
    }

    query.orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.minAmountCents', 'ASC');

    return query.getMany();
  }

  /**
   * 计算满减优惠
   */
  async calculateDiscount(amountCents: number, orderType?: string): Promise<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }> {
    const rules = await this.discountRuleRepo.find({
      where: { status: true },
      order: { priority: 'DESC', minAmountCents: 'ASC' },
    });

    // 筛选适用的规则
    const applicableRules = rules.filter(rule => {
      if (orderType && rule.applyTo !== 'order' && rule.applyTo !== orderType) {
        return false;
      }
      return Number(rule.minAmountCents) <= amountCents;
    });

    if (applicableRules.length === 0) {
      return null;
    }

    // 选择优惠最大的规则
    const bestRule = applicableRules.reduce((best, current) => {
      const currentDiscount = Number(current.discountAmountCents);
      const bestDiscount = Number(best.discountAmountCents);
      return currentDiscount > bestDiscount ? current : best;
    });

    let discountAmount = Number(bestRule.discountAmountCents);

    // 检查最大优惠限制
    if (bestRule.maxDiscountCents && discountAmount > Number(bestRule.maxDiscountCents)) {
      discountAmount = Number(bestRule.maxDiscountCents);
    }

    return {
      ruleId: bestRule.id,
      ruleName: bestRule.name,
      discountAmount,
    };
  }

  /**
   * 应用最优满减规则
   */
  async applyBestDiscountRule(amountCents: number): Promise<{
    discount: number;
    rule: DiscountRule | null;
  }> {
    const result = await this.calculateDiscount(amountCents);

    if (!result) {
      return { discount: 0, rule: null };
    }

    const rule = await this.discountRuleRepo.findOne({ where: { id: result.ruleId } });

    return {
      discount: result.discountAmount,
      rule,
    };
  }

  // ==================== 邀请有礼 ====================

  /**
   * 生成用户邀请码
   */
  async generateInviteCode(userId: string): Promise<string> {
    // 检查是否已有邀请码
    const existing = await this.invitationRepo.findOne({
      where: { inviterId: userId },
    });

    if (existing) {
      return existing.inviteeCode;
    }

    // 生成唯一邀请码
    const inviteeCode = await this.generateUniqueCode();

    const invitation = this.invitationRepo.create({
      inviterId: userId,
      inviteeCode,
      status: InvitationStatus.PENDING,
      rewardPoints: 500, // 默认奖励500积分
    });

    await this.invitationRepo.save(invitation);

    return inviteeCode;
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(code: string, inviteeId: string): Promise<{
    valid: boolean;
    inviterId?: string;
    rewardPoints?: number;
  }> {
    const invitation = await this.invitationRepo.findOne({
      where: { inviteeCode: code },
    });

    if (!invitation) {
      return { valid: false };
    }

    // 检查是否已被使用
    if (invitation.inviteeId && invitation.inviteeId !== inviteeId) {
      return { valid: false };
    }

    // 不能邀请自己
    if (invitation.inviterId === inviteeId) {
      return { valid: false };
    }

    return {
      valid: true,
      inviterId: invitation.inviterId,
      rewardPoints: invitation.rewardPoints,
    };
  }

  /**
   * 绑定邀请关系
   */
  async bindInvitation(code: string, inviteeId: string): Promise<Invitation> {
    const invitation = await this.invitationRepo.findOne({
      where: { inviteeCode: code },
    });

    if (!invitation) {
      throw new NotFoundException('邀请码不存在');
    }

    if (invitation.inviteeId && invitation.inviteeId !== inviteeId) {
      throw new BadRequestException('邀请码已被使用');
    }

    if (invitation.inviterId === inviteeId) {
      throw new BadRequestException('不能使用自己的邀请码');
    }

    invitation.inviteeId = inviteeId;
    invitation.status = InvitationStatus.COMPLETED;

    return this.invitationRepo.save(invitation);
  }

  /**
   * 发放邀请奖励
   */
  async grantInvitationReward(invitationId: string): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
    });

    if (!invitation || invitation.status === InvitationStatus.REWARDED) {
      return;
    }

    // 发放积分
    if (invitation.rewardPoints > 0) {
      await this.couponService.addPoints(
        invitation.inviterId,
        invitation.rewardPoints,
        'invitation',
        `邀请好友奖励`,
      );
    }

    // 发放优惠券（如果配置）
    if (invitation.rewardCouponId) {
      await this.couponService.claimCoupon(invitation.inviterId, invitation.rewardCouponId);
    }

    invitation.status = InvitationStatus.REWARDED;
    invitation.rewardedAt = new Date();

    await this.invitationRepo.save(invitation);
  }

  /**
   * 获取用户的邀请记录
   */
  async getUserInvitations(userId: string): Promise<{
    inviteeCode: string;
    totalInvited: number;
    rewarded: number;
    list: Invitation[];
  }> {
    const invitations = await this.invitationRepo.find({
      where: { inviterId: userId },
      order: { createdAt: 'DESC' },
    });

    const inviteeCode = invitations[0]?.inviteeCode || '';
    const totalInvited = invitations.filter(i => i.inviteeId).length;
    const rewarded = invitations.filter(i => i.status === InvitationStatus.REWARDED).length;

    return {
      inviteeCode,
      totalInvited,
      rewarded,
      list: invitations,
    };
  }

  // ==================== 用户参与检查 ====================

  /**
   * 检查用户是否符合活动参与条件
   */
  async checkUserEligibility(activity: Activity, userId: string): Promise<boolean> {
    // 检查用户是否已达到参与上限
    const userKey = `activity:${activity.id}:user:${userId}`;
    const usedCount = await this.redis.get(userKey);

    if (usedCount && Number(usedCount) >= activity.limitPerUser) {
      return false;
    }

    // 检查活动适用的用户类型
    const rules = activity.rules;
    if (rules?.applicableUsers === 'new') {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || user.orders?.length > 0) {
        return false;
      }
    }

    if (rules?.applicableUsers === 'member') {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || !user.levelId) {
        return false;
      }
    }

    return true;
  }

  /**
   * 记录用户参与活动
   */
  async recordUserParticipation(activityId: string, userId: string): Promise<void> {
    const userKey = `activity:${activityId}:user:${userId}`;
    await this.redis.incr(userKey);

    // 更新活动参与人数
    await this.activityRepo
      .createQueryBuilder()
      .update(Activity)
      .set({
        participantCount: () => 'participant_count + 1',
      })
      .where('id = :id', { id: activityId })
      .execute();
  }

  // ==================== 营销效果分析 ====================

  /**
   * 获取活动效果统计
   */
  async getActivityEffect(activityId: string): Promise<{
    participantCount: number;
    orderCount: number;
    orderAmount: number;
    avgOrderAmount: number;
    conversionRate: number;
    roi: number;
  }> {
    const activity = await this.activityRepo.findOne({ where: { id: activityId } });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    // 查询活动期间相关订单（简化实现）
    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(activity.startTime, activity.endTime),
      },
    });

    const orderCount = orders.length;
    const orderAmount = orders.reduce((sum, o) => sum + Number(o.totalAmountCents || 0), 0);
    const avgOrderAmount = orderCount > 0 ? Math.round(orderAmount / orderCount) : 0;
    const conversionRate = activity.participantCount > 0
      ? Math.round((orderCount / activity.participantCount) * 10000) / 100
      : 0;

    // ROI 计算（简化）
    const discountAmount = Number(activity.rules?.maxDiscount || 0);
    const roi = discountAmount > 0
      ? Math.round(((orderAmount - discountAmount) / discountAmount) * 100) / 100
      : 0;

    return {
      participantCount: activity.participantCount,
      orderCount,
      orderAmount,
      avgOrderAmount,
      conversionRate,
      roi,
    };
  }

  // ==================== 营销风控 ====================

  /**
   * 检查用户是否有刷活动行为
   */
  async checkSuspiciousActivity(userId: string, activityId: string): Promise<{
    isSuspicious: boolean;
    reason?: string;
  }> {
    // 检查短时间内频繁参与
    const key = `activity:${activityId}:user:${userId}:attempts`;
    const attempts = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1小时过期

    if (attempts > 10) {
      return { isSuspicious: true, reason: '参与频率过高' };
    }

    // 检查设备/IP（简化）
    // TODO: 增加设备指纹和IP检测

    return { isSuspicious: false };
  }

  // ==================== 辅助方法 ====================

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (await this.invitationRepo.findOne({ where: { inviteeCode: code } }));

    return code;
  }
}