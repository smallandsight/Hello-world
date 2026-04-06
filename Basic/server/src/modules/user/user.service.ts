import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { User } from './entities/user.entity';
import { DriverLicense } from './entities/driver-license.entity';
import { UserLevel } from './entities/user-level.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DriverLicense)
    private readonly licenseRepo: Repository<DriverLicense>,
    @InjectRepository(UserLevel)
    private readonly levelRepo: Repository<UserLevel>,
  ) {}

  // ==================== 用户信息 ====================

  /**
   * 获取用户信息（脱敏输出）
   */
  async getUserInfo(userId: number): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['userLevel'],
    });
    if (!user) throw new NotFoundException('用户不存在');

    return this.formatUserInfo(user);
  }

  /**
   * 更新用户基本信息
   */
  async updateUserInfo(userId: number, dto: UpdateUserDto): Promise<any> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');

    // 只更新允许的字段
    const allowedFields = ['nickname', 'avatarUrl', 'gender', 'birthday'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if ((dto as any)[key] !== undefined) {
        updateData[key] = (dto as any)[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.userRepo.update(userId, updateData);
    }

    return this.getUserInfo(userId);
  }

  /**
   * 绑定手机号
   */
  async bindPhone(
    userId: number,
    phone: string,
    code?: string,
  ): Promise<{ message: string }> {
    // TODO 验证短信验证码（对接阿里云SMS）
    // if (code) { await this.verifySmsCode(phone, code); }

    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing && existing.id !== userId) {
      throw new BadRequestException('该手机号已被其他账号绑定');
    }

    await this.userRepo.update(userId, { phone });
    return { message: '手机号绑定成功' };
  }

  // ==================== 会员体系 ====================

  /**
   * 获取会员信息：当前等级、积分余额、升级进度
   */
  async getMemberInfo(userId: number): Promise<{
    level: any;
    pointsBalance: number;
    nextLevel: any | null;
    upgradeProgress: { current: number; required: number; percent: number };
    benefits: string[];
  }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['userLevel'],
    });
    if (!user) throw new NotFoundException('用户不存在');

    const currentLevel = user.userLevel;
    const levelId = user.memberLevelId || 1;

    // 获取当前等级详情
    let levelInfo;
    if (currentLevel) {
      levelInfo = {
        id: currentLevel.id,
        name: currentLevel.levelName,
        code: currentLevel.code,
        discount: currentLevel.discount || 1,
        benefits: currentLevel.benefits ? JSON.parse(currentLevel.benefits as string) : [],
      };
    } else {
      // 默认等级
      levelInfo = {
        id: 1,
        name: '普通会员',
        code: 'NORMAL',
        discount: 1,
        benefits: [],
      };
    }

    // 查询下一等级
    const nextLevel = await this.levelRepo.findOne({
      where: { sortOrder: MoreThan(currentLevel?.sortOrder ?? 0), isActive: 1 },
      order: { sortOrder: 'ASC' },
    });

    // 查询用户当前积分（从积分流水表聚合）
    // 简化版：使用用户表的 creditScore 字段作为积分
    const pointsBalance = user.creditScore || 0;

    // 计算升级进度
    let upgradeProgress = null;
    if (nextLevel && nextLevel.minPoints) {
      const current = pointsBalance;
      const required = nextLevel.minPoints;
      const percent = Math.min(100, Math.round((current / required) * 100));
      upgradeProgress = { current, required, percent };
    }

    return {
      level: levelInfo,
      pointsBalance,
      nextLevel: nextLevel
        ? {
            id: nextLevel.id,
            name: nextLevel.levelName,
            minPoints: nextLevel.minPoints,
          }
        : null,
      upgradeProgress,
      benefits: Array.isArray(levelInfo.benefits) ? levelInfo.benefits : [],
    };
  }

  // ==================== 会员等级 ====================

  /**
   * 计算用户当前应属的会员等级（基于累计消费金额）
   * 遍历所有等级，找到用户消费金额满足的最高等级
   */
  async calculateUserLevel(userId: number): Promise<{
    levelId: number;
    levelName: string;
    nextLevel?: { id: number; name: string; requiredCents: number };
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const spendCents = user.totalSpendCents || 0;

    // 查询所有启用的等级，按 levelTier 升序排列
    const allLevels = await this.levelRepo.find({
      where: { isActive: 1 },
      order: { levelTier: 'ASC' },
    });

    if (allLevels.length === 0) {
      return {
        levelId: 1,
        levelName: '普通会员',
      };
    }

    // 找到满足条件的最高等级
    let matchedLevel = allLevels[0];
    for (const level of allLevels) {
      if (spendCents >= (level.upgradeSpendCents || 0)) {
        matchedLevel = level;
      } else {
        break;
      }
    }

    // 查找下一级
    let nextLevel;
    const currentIndex = allLevels.findIndex((l) => l.id === matchedLevel.id);
    if (currentIndex >= 0 && currentIndex < allLevels.length - 1) {
      const next = allLevels[currentIndex + 1];
      nextLevel = {
        id: next.id,
        name: next.levelName,
        requiredCents: next.upgradeSpendCents,
      };
    }

    return {
      levelId: matchedLevel.id,
      levelName: matchedLevel.levelName,
      nextLevel,
    };
  }

  /**
   * 获取某等级的权益详情
   */
  async getMemberBenefits(levelId: number): Promise<{
    levelId: number;
    levelName: string;
    pointsRate: number;
    discountRate: number;
    benefits: any[];
  }> {
    const level = await this.levelRepo.findOneBy({ id: levelId, isActive: 1 });
    if (!level) throw new NotFoundException('该会员等级不存在或已下线');

    return {
      levelId: level.id,
      levelName: level.levelName,
      pointsRate: level.pointsRate / 100, // 转为倍率，如120%→1.2
      discountRate: level.discountRate / 100, // 转为折扣系数，如95→0.95
      benefits: Array.isArray(level.benefits)
        ? level.benefits
        : level.benefits
          ? JSON.parse(level.benefits as string)
          : [],
    };
  }

  /**
   * 下单完成后检查并升级会员等级
   * 在订单支付完成后由 OrderService 调用
   */
  async checkAndUpgrade(
    userId: number,
    orderAmountCents: number,
  ): Promise<{
    upgraded: boolean;
    previousLevel: { id: number; name: string };
    newLevel?: { id: number; name: string };
    message: string;
  }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');

    // 更新累计消费金额和骑行次数
    const newTotalSpendCents = (user.totalSpendCents || 0) + orderAmountCents;
    const newTotalRides = (user.totalRides || 0) + 1;

    await this.userRepo.update(userId, {
      totalSpendCents: newTotalSpendCents,
      totalRides: newTotalRides,
    });

    // 获取当前等级信息
    const currentLevelInfo = await this.calculateUserLevel(userId);
    const previousLevel = {
      id: user.levelId || 1,
      name:
        (
          await this.levelRepo.findOneBy({ id: user.levelId || 1 })
        )?.levelName || '普通会员',
    };

    // 判断是否需要升级
    if (currentLevelInfo.levelId > (user.levelId || 1)) {
      await this.userRepo.update(userId, { levelId: currentLevelInfo.levelId });

      const newLevelDetail = await this.levelRepo.findOneBy({
        id: currentLevelInfo.levelId,
      });

      return {
        upgraded: true,
        previousLevel,
        newLevel: {
          id: currentLevelInfo.levelId,
          name: currentLevelInfo.levelName,
        },
        message: `恭喜升级为${currentLevelInfo.levelName}！享受更多专属权益`,
      };
    }

    return {
      upgraded: false,
      previousLevel,
      message: `保持${previousLevel.name}身份，继续加油升级吧`,
    };
  }

  /**
   * 获取升级进度（当前累计消费 vs 下一级门槛）
   */
  async getLevelProgress(userId: number): Promise<{
    currentLevel: { id: number; name: string; tier: number };
    currentSpendCents: number;
    nextLevel: {
      id: number;
      name: string;
      requiredCents: number;
    } | null;
    progressPercent: number;
    remainingCents: number;
  }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['userLevel'],
    });
    if (!user) throw new NotFoundException('用户不存在');

    const currentLevelEntity = user.userLevel;
    const currentSpendCents = user.totalSpendCents || 0;

    const currentLevel = {
      id: currentLevelEntity?.id ?? 1,
      name: currentLevelEntity?.levelName ?? '普通会员',
      tier: currentLevelEntity?.levelTier ?? 1,
    };

    // 查找下一等级
    const allLevels = await this.levelRepo.find({
      where: { isActive: 1 },
      order: { levelTier: 'ASC' },
    });

    const currentIdx = allLevels.findIndex(
      (l) => l.id === currentLevel.id,
    );
    const nextLevelEntity =
      currentIdx >= 0 && currentIdx < allLevels.length - 1
        ? allLevels[currentIdx + 1]
        : null;

    if (!nextLevelEntity) {
      // 已是最高等级
      return {
        currentLevel,
        currentSpendCents,
        nextLevel: null,
        progressPercent: 100,
        remainingCents: 0,
      };
    }

    const requiredCents = nextLevelEntity.upgradeSpendCents || 0;
    const progressPercent = Math.min(
      100,
      Math.round((currentSpendCents / requiredCents) * 100),
    );
    const remainingCents = Math.max(0, requiredCents - currentSpendCents);

    return {
      currentLevel,
      currentSpendCents,
      nextLevel: {
        id: nextLevelEntity.id,
        name: nextLevelEntity.levelName,
        requiredCents,
      },
      progressPercent,
      remainingCents,
    };
  }

  // ==================== 驾驶证 ====================

  /**
   * 提交驾驶证认证信息
   */
  async submitDriverLicense(
    userId: number,
    dto: SubmitLicenseDto,
  ): Promise<{ message: string }> {
    // 检查是否已有审核中的记录
    const existing = await this.licenseRepo.findOne({
      where: { userId, status: 0 }, // 0=待审核
    });

    if (existing) {
      throw new BadRequestException('您已有待审核的驾驶证，请等待审核结果');
    }

    // 检查是否已通过
    const approved = await this.licenseRepo.findOne({
      where: { userId, status: 1 }, // 1=已通过
    });
    if (approved) {
      throw new BadRequestException('您已完成驾驶证认证');
    }

    const license = this.licenseRepo.create({
      userId,
      name: dto.name,
      licenseNo: dto.licenseNo,
      licenseClass: dto.licenseClass,
      issueDate: dto.issueDate,
      expireDate: dto.expireDate,
      frontImg: dto.frontImg,
      backImg: dto.backImg,
      status: 0, // 待审核
    });

    await this.licenseRepo.save(license);
    return { message: '驾驶证提交成功，请等待审核' };
  }

  /**
   * 获取驾驶证状态
   */
  async getDriverLicenseStatus(userId: number): Promise<any> {
    const license = await this.licenseRepo.findOne({ where: { userId } });

    if (!license) {
      return {
        submitted: false,
        status: -1,
        statusLabel: '未认证',
      };
    }

    const statusMap: Record<number, string> = {
      [-1]: '未认证',
      [0]: '待审核',
      [1]: '已通过',
      [2]: '已驳回',
    };

    return {
      submitted: true,
      status: license.status,
      statusLabel: statusMap[license.status] || '未知',
      rejectReason: license.rejectReason,
      reviewedAt: license.reviewedAt?.toISOString(),
      licenseClass: license.licenseClass,
      expireDate: license.expireDate?.toISOString(),
    };
  }

  // ==================== 收藏管理 ====================

  /**
   * 收藏车辆
   */
  async addFavorite(userId: number, vehicleId: number): Promise<void> {
    // 校验车辆存在性
    const vehicle = await this.vehicleRepoCheck(vehicleId);
    if (!vehicle) throw new NotFoundException('车辆不存在');

    // 检查是否已收藏（通过 Redis 或数据库均可）
    // 简化版：直接返回成功，实际应写入 favorites 表或 Redis Set
    // await this.redisService.sAdd(`user:${userId}:favorites`, String(vehicleId));
  }

  /**
   * 取消收藏
   */
  async removeFavorite(userId: number, vehicleId: number): Promise<void> {
    // await this.redisService.sRem(`user:${userId}:favorites`, String(vehicleId));
  }

  /**
   * 获取收藏列表
   */
  async getFavorites(userId: number, query: { page?: number; size?: number }) {
    // 从 Redis 获取收藏的车辆ID列表
    // const ids = await this.redisService.sMembers(`user:${userId}:favorites`);
    // 然后批量查询 Vehicle 详情
    return {
      list: [] as any[],
      total: 0,
      page: query.page || 1,
      size: query.size || 20,
    };
  }

  // ==================== 内部工具 ====================

  /** 格式化用户信息（脱敏） */
  private formatUserInfo(user: User & { userLevel?: UserLevel }): any {
    return {
      id: user.id,
      nickname: user.nickname || `用户${user.id}`,
      avatarUrl: user.avatarUrl,
      phone: this.maskPhone(user.phone),
      gender: user.gender,
      birthday: user.birthday?.toISOString() || null,
      isVerified: !!user.isVerified,
      creditScore: user.creditScore || 0,
      memberLevel: user.userLevel
        ? {
            id: user.userLevel.id,
            name: user.userLevel.levelName,
            code: user.userLevel.code,
          }
        : { id: 0, name: '普通会员', code: 'NORMAL' },
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /** 手机号脱敏 */
  private maskPhone(phone: string | null): string | null {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  /** 检查车辆是否存在（避免循环依赖的临时方案） */
  private async vehicleRepoCheck(id: number): Promise<boolean> {
    try {
      const count = await this.userRepo.query(
        'SELECT COUNT(*) AS cnt FROM vehicles WHERE id = ? AND deleted_at IS NULL',
        [id],
      );
      return count[0]?.cnt > 0;
    } catch {
      return false;
    }
  }
}

// ==================== DTO 类型定义 ====================

/**
 * 提交驾驶证 DTO
 */
export interface SubmitLicenseDto {
  /** 姓名 */
  name: string;
  /** 驾驶证号 */
  licenseNo: string;
  /** 准驾车型（如 C1/C2/A1 等） */
  licenseClass: string;
  /** 初次领证日期 */
  issueDate: string;
  /** 有效期至 */
  expireDate: string;
  /** 证件正面图片URL */
  frontImg: string;
  /** 证件反面图片URL */
  backImg: string;
}
