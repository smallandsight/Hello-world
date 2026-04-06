import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PointsRecord } from '../entities/points-record.entity';
import { User } from '../../user/entities/user.entity';
import {
  PointsRecordQueryDto,
  PointsActionType,
} from './points.dto';

/**
 * 积分规则配置
 * 各场景下的积分获取/消耗规则
 */
const POINTS_RULES = {
  /** 订单完成：每100元得100积分，单次上限500 */
  ORDER_COMPLETE: {
    pointsPerUnit: 100, // 每100元（分为单位）
    unitCents: 10000,   // 100元=10000分
    maxPoints: 500,
    description: '订单完成奖励',
  },
  /** 每日签到：5积分，每天限1次 */
  SIGN_IN: {
    points: 5,
    dailyLimit: 1,
    description: '每日签到',
  },
  /** 发表评价：20积分 + 带图额外10分 */
  REVIEW: {
    points: 20,
    extraForImage: 10,
    description: '评价奖励',
  },
  /** 邀请好友注册并完成首单：100积分 */
  INVITE: {
    points: 100,
    description: '邀请奖励',
  },
} as const;

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectRepository(PointsRecord)
    private readonly recordRepo: Repository<PointsRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ==================== 积分查询 ====================

  /**
   * 获取用户积分余额
   */
  async getBalance(userId: number): Promise<number> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');
    return user.pointsBalance || 0;
  }

  /**
   * 获取用户积分流水记录（分页）
   * 返回格式: { list, total, page, size, pages }
   */
  async getRecords(
    userId: number,
    query: PointsRecordQueryDto,
  ): Promise<{
    list: PointsRecord[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const qb = this.recordRepo.createQueryBuilder('record')
      .where('record.userId = :userId', { userId });

    if (query.changeType) {
      qb.andWhere('record.changeType = :changeType', {
        changeType: query.changeType,
      });
    }

    if (query.startDate) {
      qb.andWhere('record.createdAt >= :startDate', {
        startDate: query.startDate + ' 00:00:00',
      });
    }
    if (query.endDate) {
      qb.andWhere('record.createdAt <= :endDate', {
        endDate: query.endDate + ' 23:59:59',
      });
    }

    const [list, total] = await qb
      .orderBy('record.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.size)
      .getManyAndCount();

    return {
      list,
      total,
      page: query.page,
      size: query.size,
      pages: Math.ceil(total / query.size),
    };
  }

  // ==================== 签到功能 ====================

  /**
   * 执行每日签到，返回签到结果和获得的积分
   */
  async signIn(
    userId: number,
  ): Promise<{ success: boolean; pointsEarned: number; totalBalance: number; message: string }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');

    // 检查今日是否已签到
    const alreadySigned = await this.checkTodaySigned(userId);
    if (alreadySigned) {
      throw new ConflictException('今天已经签过了，明天再来吧~');
    }

    const rule = POINTS_RULES.SIGN_IN;
    const earned = rule.points;

    // 记录积分变动并更新余额
    await this.addPoints(userId, PointsActionType.SIGN_IN, undefined, earned);

    const newBalance = (user.pointsBalance || 0) + earned;

    return {
      success: true,
      pointsEarned: earned,
      totalBalance: newBalance,
      message: `签到成功！获得 ${earned} 积分`,
    };
  }

  /**
   * 检查用户今日是否已签到
   */
  async checkTodaySigned(userId: number): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const count = await this.recordRepo.count({
      where: {
        userId,
        changeType: 'earn' as any,
        createdAt: Between(todayStart, todayEnd),
        description: `每日签到+${POINTS_RULES.SIGN_IN.points}`,
      },
    });

    return count > 0;
  }

  // ==================== 核心积分操作 ====================

  /**
   * 增加用户积分（通用方法）
   * @param userId 用户ID
   * @param actionType 动作类型
   * @param relatedId 关联ID（如订单ID等，可选）
   * @param amount 增加的积分数（可选，默认根据规则计算）
   * @returns 变动后的余额
   */
  async addPoints(
    userId: number,
    actionType: PointsActionType,
    relatedId?: number,
    amount?: number,
  ): Promise<number> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');

    let pointsToAdd = amount ?? 0;

    // 如果未指定金额，尝试按规则自动计算
    if (!amount && actionType in POINTS_RULES) {
      const ruleKey = actionType as keyof typeof POINTS_RULES;
      pointsToAdd = (POINTS_RULES[ruleKey] as any).points || 0;
    }

    if (pointsToAdd <= 0) {
      return user.pointsBalance || 0;
    }

    const currentBalance = user.pointsBalance || 0;
    const newBalance = currentBalance + pointsToAdd;

    // 更新用户积分余额
    await this.userRepo.update(userId, { pointsBalance: newBalance });

    // 写入积分记录
    const record = this.recordRepo.create({
      userId,
      changeType: 'earn' as any,
      pointsChange: pointsToAdd,
      balanceAfter: newBalance,
      orderId: relatedId,
      description: `${this.getActionDescription(actionType)}+${pointsToAdd}`,
    });
    await this.recordRepo.save(record);

    this.logger.log(`用户${userId} 积分+${pointsToAdd} (动作:${actionType}) 余额:${newBalance}`);
    return newBalance;
  }

  /**
   * 订单完成后计算并发放积分
   * 根据 User 的会员等级应用积分倍率
   */
  async addOrderPoints(
    userId: number,
    orderAmountCents: number,
    orderId: number,
  ): Promise<{ pointsEarned: number; balanceAfter: number }> {
    const rule = POINTS_RULES.ORDER_COMPLETE;

    // 基础积分 = (金额 / 单位金额) × 每单位积分
    const basePoints = Math.floor(orderAmountCents / rule.unitCents) * rule.pointsPerUnit;
    const earned = Math.min(basePoints, rule.maxPoints);

    if (earned <= 0) {
      const balance = await this.getBalance(userId);
      return { pointsEarned: 0, balanceAfter: balance };
    }

    const balance = await this.addPoints(
      userId,
      PointsActionType.ORDER_COMPLETE,
      orderId,
      earned,
    );

    return { pointsEarned: earned, balanceAfter: balance };
  }

  /**
   * 扣减用户积分
   * @returns 是否扣减成功（积分不足时返回 false）
   */
  async deductPoints(
    userId: number,
    amount: number,
    reason?: string,
    orderId?: number,
  ): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');

    const currentBalance = user.pointsBalance || 0;
    if (currentBalance < amount) {
      return false; // 积分不足
    }

    const newBalance = currentBalance - amount;

    // 更新余额
    await this.userRepo.update(userId, { pointsBalance: newBalance });

    // 写入扣减记录
    const record = this.recordRepo.create({
      userId,
      changeType: 'spend' as any,
      pointsChange: -amount,
      balanceAfter: newBalance,
      orderId: orderId || null,
      description: reason ? `${reason}-${amount}` : `积分抵扣-${amount}`,
    });
    await this.recordRepo.save(record);

    this.logger.log(`用户${userId} 积分-${amount} (原因:${reason}) 余额:${newBalance}`);
    return true;
  }

  // ==================== 内部工具 ====================

  /** 根据动作类型获取描述文本 */
  private getActionDescription(actionType: PointsActionType): string {
    const descriptions: Record<string, string> = {
      ORDER_COMPLETE: '订单完成奖励',
      SIGN_IN: '每日签到',
      REVIEW: '评价奖励',
      INVITE: '邀请奖励',
      ADMIN_ADJUST: '管理员调整',
      DEDUCT: '积分扣减',
      REFUND: '退款退还',
    };
    return descriptions[actionType] || '积分变动';
  }
}
