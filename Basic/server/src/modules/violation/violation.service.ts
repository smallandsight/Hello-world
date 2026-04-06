import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Between, In } from 'typeorm';
import { ViolationDeposit } from './entities/violation-deposit.entity';
import { FreezeViolationDepositDto, DeductViolationDto, RefundViolationDto } from './dto/violation.dto';

const logger = new Logger('ViolationService');

/** 默认观察期天数 */
const DEFAULT_OBSERVATION_DAYS = 30;

@Injectable()
export class ViolationService {
  constructor(
    @InjectRepository(ViolationDeposit)
    private readonly repo: Repository<ViolationDeposit>,
  ) {}

  // ==================== 冻结 ====================

  /**
   * 冻结违章押金
   * 还车时由订单服务调用
   *
   * 流程：
   * 1. 检查订单是否已有冻结记录（幂等）
   * 2. 创建冻结记录，状态FROZEN
   * 3. 计算观察期截止时间
   * TODO: 调用支付宝预授权冻结接口
   */
  async freezeDeposit(dto: FreezeViolationDepositDto): Promise<ViolationDeposit> {
    // 幂等检查：同一订单不能重复冻结
    const existing = await this.repo.findOne({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      if (existing.status === 'FROZEN') {
        return existing; // 已冻结，直接返回
      }
      throw new BadRequestException(`该订单违章押金已处理(当前状态: ${existing.status})`);
    }

    const observationEndAt = new Date();
    observationEndAt.setDate(
      observationEndAt.getDate() + (dto.observationDays || DEFAULT_OBSERVATION_DAYS),
    );

    const deposit = this.repo.create({
      orderId: dto.orderId,
      vehicleId: dto.vehicleId,
      userId: dto.userId || 0, // 从order中获取
      amountCents: dto.amountCents,
      status: 'FROZEN',
      frozenTransactionId: `FREEZE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      observationEndAt,
    });

    const saved = await this.repo.save(deposit);
    logger.log(
      `[Freeze] 订单${dto.orderId} 违章押金${dto.amountCents}分已冻结, 到期${observationEndAt.toISOString()}`
    );
    return saved;
  }

  // ==================== 查询 ====================

  /** 根据订单ID查询违章押金记录 */
  async getByOrderId(orderId: number): Promise<ViolationDeposit | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  /** 商家端列表查询 */
  async getList(query: {
    page?: number;
    size?: number;
    status?: string;
    userId?: number;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.repo.createQueryBuilder('vd')
      .where('vd.deleted_at IS NULL');

    if (query.status) qb.andWhere('vd.status = :s', { s: query.status });
    if (query.userId) qb.andWhere('vd.user_id = :u', { u: query.userId });

    const [list, total] = await qb
      .orderBy('vd.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  // ==================== 扣除 ====================

  /**
   * 扣除违章押金
   * 商家发现违章后调用
   */
  async deduct(id: number, dto: DeductViolationDto, operatorId: number): Promise<ViolationDeposit> {
    const deposit = await this.repo.findOneBy({ id });
    if (!deposit) throw new NotFoundException('违章押金记录不存在');
    if (deposit.status !== 'FROZEN') {
      throw new BadRequestException(`当前状态${deposit.status}不允许扣除`);
    }
    if (dto.deductionAmountCents > deposit.amountCents) {
      throw new BadRequestException('扣除金额不能超过冻结金额');
    }

    await this.repo.update(id, {
      status: dto.deductionAmountCents >= deposit.amountCents ? 'DEDUCTED' : 'PARTIAL_REFUND',
      deductionAmount: dto.deductionAmountCents,
      violationDetail: dto.violationDetail || {},
      deductedAt: new Date(),
      remark: dto.remark || `操作员${operatorId}手动扣除`,
    });

    logger.log(`[Deduct] 违章押金#${id} 扣除${dto.deductionAmountCents}分`);
    return this.repo.findOneBy({ id });
  }

  // ==================== 退还 ====================

  /**
   * 退还违章押金
   * 观察期满无违章时自动触发 或 商家手动触发
   */
  async refund(
    id: number,
    dto?: RefundViolationDto,
    operatorId?: number,
  ): Promise<ViolationDeposit> {
    const deposit = await this.repo.findOneBy({ id });
    if (!deposit) throw new NotFoundException('违章押金记录不存在');
    if (deposit.status !== 'FROZEN' && deposit.status !== 'PARTIAL_REFUND') {
      throw new BadRequestException(`当前状态${deposit.status}不允许退还`);
    }

    let refundAmount: number;
    if (deposit.status === 'PARTIAL_REFUND') {
      // 部分退还：剩余部分
      refundAmount = deposit.amountCents - (deposit.deductionAmount || 0);
    } else {
      refundAmount = dto?.refundAmountCents ?? deposit.amountCents;
    }

    if (refundAmount <= 0) {
      throw new BadRequestException('无可退还金额');
    }

    // TODO: 调用支付宝预授权解冻/退款接口
    await this.repo.update(id, {
      status: refundAmount >= deposit.amountCents ? 'REFUNDED' : 'PARTIAL_REFUND',
      refundAmount,
      refundedAt: new Date(),
      remark: operatorId
        ? `操作员${operatorId}手动退款: ${dto?.remark || ''}`
        : '观察期到期自动退款',
    });

    logger.log(`[Refund] 违章押金#${id} 退回${refundAmount}分`);
    return this.repo.findOneBy({ id });
  }

  // ==================== 定时任务 ====================

  /**
   * 自动扫描到期的冻结记录并执行自动退款
   * 建议每小时执行一次
   */
  async autoRefundExpired(): Promise<{ checked: number; refunded: number }> {
    const now = new Date();

    const expired = await this.repo.find({
      where: {
        status: 'FROZEN',
        observationEndAt: LessThan(now),
      },
    });

    let refunded = 0;
    for (const dep of expired) {
      try {
        await this.refund(dep.id);
        refunded++;
      } catch (e) {
        logger.error(`[AutoRefund] #${dep.id} 自动退款失败: ${(e as Error).message}`);
      }
    }

    return { checked: expired.length, refunded };
  }

  // ==================== 统计 ====================

  /** 违章押金统计概览（商家端Dashboard使用）*/
  async getStats() {
    const [frozenCount, frozenSum, deductedCount, deductedSum, refundedCount, refundedSum] =
      await Promise.all([
        this.repo.count({ where: { status: 'FROZEN' } }),
        this.repo
          .createQueryBuilder('vd')
          .select('COALESCE(SUM(vd.amount_cents), 0)', 'total')
          .where('vd.status = :s', { s: 'FROZEN' })
          .getRawOne(),
        this.repo.count({ where: { status: In(['DEDUCTED', 'PARTIAL_REFUND']) } }),
        this.repo
          .createQueryBuilder('vd')
          .select('COALESCE(SUM(vd.deduction_amount), 0)', 'total')
          .where('vd.status IN (:...s)', { s: ['DEDUCTED', 'PARTIAL_REFUND'] })
          .getRawOne(),
        this.repo.count({ where: { status: 'REFUNDED' } }),
        this.repo
          .createQueryBuilder('vd')
          .select('COALESCE(SUM(vd.refund_amount), 0)', 'total')
          .where('vd.status = :s', { s: 'REFUNDED' })
          .getRawOne(),
      ]);

    return {
      frozen: { count: frozenCount, totalCents: parseInt(frozenSum?.total || '0', 10) },
      deducted: { count: deductedCount, totalCents: parseInt(deductedSum?.total || '0', 10) },
      refunded: { count: refundedCount, totalCents: parseInt(refundedSum?.total || '0', 10) },
    };
  }
}

// 补充导入
import { LessThan } from 'typeorm';
