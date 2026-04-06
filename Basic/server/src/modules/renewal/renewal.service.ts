import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Between } from 'typeorm';
import { Renewal } from './entities/renewal.entity';
import { ApplyRenewalDto, ApproveRenewalDto } from './dto/renewal.dto';

const logger = new Logger('RenewalService');

@Injectable()
export class RenewalService {
  constructor(
    @InjectRepository(Renewal)
    private readonly repo: Repository<Renewal>,
  ) {}

  // ==================== 用户侧 ====================

  /**
   * 申请续租
   *
   * 校验：
   * 1. 订单必须处于"使用中"状态
   * 2. 不能有进行中的续租申请
   * 3. 续租天数限制（1~30天）
   */
  async apply(dto: ApplyRenewalDto): Promise<Renewal> {
    // 检查是否已有待处理的申请
    const existing = await this.repo.findOne({
      where: { orderId: dto.orderId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('该订单已有待审批的续租申请');

    // TODO: 校验订单状态（需注入OrderRepository）
    // const order = await orderRepo.findOneBy({ id: dto.orderId });

    // 计算额外费用（基于当前定价规则）
    // TODO: 调用 VehicleService.calculatePricing() 计算
    const extraFareCents = this.estimateExtraFare(dto.requestedDays);

    const renewal = this.repo.create({
      orderId: dto.orderId,
      originalReturnTime: new Date(), // TODO: 从订单获取
      requestedDays: dto.requestedDays,
      extraFareCents,
      status: 'PENDING',
    });

    logger.log(`[Renewal] 订单${dto.orderId} 申请续租${dto.requestedDays}天`);
    return this.repo.save(renewal);
  }

  /** 获取我的续租记录 */
  async getMyRenewals(userId: number, query?: { page?: number; size?: number }) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);

    // TODO: 关联订单查询
    const [list, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  /** 支付续租费用 */
  async pay(renewalId: number): Promise<Renewal> {
    const renewal = await this.repo.findOneBy({ id: renewalId });
    if (!renewal) throw new NotFoundException('续租申请不存在');
    if (renewal.status !== 'APPROVED') throw new BadRequestException('仅已通过可支付');

    // TODO: 创建支付单并调用第三方支付
    await this.repo.update(renewalId, {
      status: 'PAID',
      paidAt: new Date(),
    });

    logger.log(`[RenewalPay] #${renewalId} 已支付${renewal.extraFareCents}分`);

    // TODO: 更新订单的还车时间
    return this.repo.findOneBy({ id: renewalId });
  }

  // ==================== 商家侧 ====================

  /**
   * 审批续租
   */
  async approve(id: number, staffId: number, dto: ApproveRenewalDto): Promise<Renewal> {
    const renewal = await this.repo.findOneBy({ id });
    if (!renewal) throw new NotFoundException('续租申请不存在');
    if (renewal.status !== 'PENDING') {
      throw new BadRequestException(`当前状态${renewal.status}不允许审批`);
    }

    if (dto.action === 'REJECTED') {
      if (!dto.remark) throw new BadRequestException('拒绝时必须填写理由');
      await this.repo.update(id, {
        status: 'REJECTED',
        approveRemark: dto.remark,
        approvedBy: staffId,
        approvedAt: new Date(),
      });
    } else {
      const finalFare = dto.adjustedFareCents ?? renewal.extraFareCents;
      await this.repo.update(id, {
        status: 'APPROVED',
        extraFareCents: finalFare,
        approveRemark: dto.remark || '审批通过',
        approvedBy: staffId,
        approvedAt: new Date(),
      });
    }

    logger.log(`[RenewalApprove] #${id} ${dto.action} by 员工${staffId}`);
    return this.repo.findOneBy({ id });
  }

  /** 商家端列表 */
  async getMerchantList(query?: {
    page?: number;
    size?: number;
    status?: string;
    orderId?: number;
  }) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);

    const qb = this.repo.createQueryBuilder('r')
      .where('r.deleted_at IS NULL');

    if (query?.status) qb.andWhere('r.status = :s', { s: query.status });
    if (query?.orderId) qb.andWhere('r.order_id = :oid', { oid: query.orderId });

    const [list, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  // ==================== 工具方法 ====================

  /** 粗估额外费用 — 实际应由定价引擎计算 */
  private estimateExtraFare(days: number): number {
    // 基础估算：每天200元(约8小时/天的均价)
    const baseDailyRateCents = 20000;
    return days * baseDailyRateCents;
  }
}
