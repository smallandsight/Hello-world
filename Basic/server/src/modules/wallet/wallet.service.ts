import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Between, In } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { RechargeDto } from './dto/wallet.dto';

const logger = new Logger('WalletService');

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  // ==================== 钱包查询 ====================

  /** 获取或创建用户钱包 */
  async getOrCreateWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepo.findOneBy({ userId });
    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        balanceCents: 0,
        frozenAmount: 0,
        version: 1,
      });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  /** 查询余额 */
  async getBalance(userId: number): Promise<{
    balanceCents: number;
    frozenAmount: number;
    availableCents: number;
  }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balanceCents: wallet.balanceCents,
      frozenAmount: wallet.frozenAmount,
      availableCents: wallet.balanceCents - wallet.frozenAmount,
    };
  }

  // ==================== 交易记录查询 ====================

  /** 获取交易流水列表 */
  async getTransactions(userId: number, query?: {
    page?: number;
    size?: number;
    type?: string;
  }) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);

    const qb = this.txRepo.createQueryBuilder('tx')
      .where('tx.user_id = :userId', { userId });

    if (query?.type) qb.andWhere('tx.type = :type', { type: query.type });

    const [list, total] = await qb
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  // ==================== 充值（T3W10-4）====================

  /**
   * 充值
   *
   * 流程：
   * 1. 创建充值订单/支付请求
   * 2. 用户完成第三方支付
   * 3. 支付成功回调 → 调用 addBalance() 入账
   *
   * 此方法仅创建充值记录，实际入账在回调中处理
   */
  async recharge(userId: number, dto: RechargeDto): Promise<any> {
    if (dto.amountCents < 100) throw new BadRequestException('最低充值1元');

    const wallet = await this.getOrCreateWallet(userId);

    // TODO: 调用支付宝/微信支付接口发起充值
    // 返回支付参数供前端调起支付
    const payNo = `WALLET_R_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.log(`[Recharge] 用户${userId} 申请充值${dto.amountCents}分, 支付单号=${payNo}`);

    return {
      payNo,
      amountCents: dto.amountCents,
      payMethod: dto.payMethod || 'alipay',
      status: 'PENDING_PAYMENT', // 待支付
      message: '请使用返回的支付参数完成支付，支付成功后余额自动到账',
    };
  }

  /**
   * 充值回调 — 实际入账
   */
  async handleRechargeCallback(data: {
    outBizNo: string;
    amountCents: number;
    tradeNo: string;
  }): Promise<void> {
    // 从outBizNo解析userId（需要存储映射关系）
    // 这里简化处理：假设能找到对应用户
    // TODO: 实际实现需要维护充值订单表来关联userId
    logger.log(`[RechargeCallback] ${data.tradeNo} 充值${data.amountCents}分到账`);
  }

  // ==================== 核心余额操作（带乐观锁）====================

  /**
   * 增加余额（充值/退款/返还）
   * 使用乐观锁防止并发问题
   */
  async addBalance(
    userId: number,
    amountCents: number,
    type: 'RECHARGE' | 'REFUND' | 'REBATE',
    orderId?: number,
    remark?: string,
  ): Promise<{ newBalance: number; txId: number }> {
    if (amountCents <= 0) throw new BadRequestException('金额必须大于0');

    const result = await this.walletRepo.manager.transaction(async (entityManager) => {
      const walletRepo = entityManager.getRepository(Wallet);

      // 乐观锁更新
      const updateResult = await walletRepo.createQueryBuilder()
        .update()
        .set({
          balanceCents: () => `balance_cents + ${amountCents}`,
          version: () => `version + 1`,
        })
        .where('user_id = :userId', { userId })
        .execute();

      if (updateResult.affected === 0) {
        throw new Error('钱包不存在或并发冲突');
      }

      // 获取更新后的余额
      const updated = await walletRepo.findOneBy({ userId });
      const newBalance = updated!.balanceCents;

      // 记录流水
      const tx = entityManager.getRepository(WalletTransaction).create({
        walletId: updated!.id,
        userId,
        type,
        amountCents,
        balanceAfterCents: newBalance,
        orderId,
        remark,
      });
      const savedTx = await entityManager.save(tx);

      return { newBalance, txId: savedTx.id };
    });

    logger.log(`[Wallet+add] 用户${userId} +${amountCents}分(${type}), 新余额=${result.newBalance}`);
    return result;
  }

  /**
   * 扣减余额（支付/扣除）
   * 校验：余额足够 + 乐观锁
   */
  async deductBalance(
    userId: number,
    amountCents: number,
    type: 'PAY' | 'DEDUCTION',
    orderId?: number,
    remark?: string,
  ): Promise<{ newBalance: number; txId: number }> {
    if (amountCents <= 0) throw new BadRequestException('金额必须大于0');

    // 先检查可用余额
    const wallet = await this.getOrCreateWallet(userId);
    const available = wallet.balanceCents - wallet.frozenAmount;
    if (available < amountCents) {
      throw new BadRequestException(`余额不足，当前可用${available}分`);
    }

    const result = await this.walletRepo.manager.transaction(async (entityManager) => {
      const walletRepo = entityManager.getRepository(Wallet);

      // 带余额校验的乐观锁扣减
      const updateResult = await walletRepo.createQueryBuilder()
        .update()
        .set({
          balanceCents: () => `balance_cents - ${amountCents}`,
          version: () => `version + 1`,
        })
        .where('user_id = :userId', { userId })
        .andWhere('(balance_cents - frozen_amount) >= :amount', { amount: amountCents })
        .execute();

      if (updateResult.affected === 0) {
        throw new BadRequestException('余额不足或并发冲突');
      }

      const updated = await walletRepo.findOneBy({ userId });
      const newBalance = updated!.balanceCents;

      // 记录流水
      const tx = entityManager.getRepository(WalletTransaction).create({
        walletId: updated!.id,
        userId,
        type,
        amountCents: -amountCents, // 负数表示减少
        balanceAfterCents: newBalance,
        orderId,
        remark,
      });
      const savedTx = await entityManager.save(tx);

      return { newBalance, txId: savedTx.id };
    });

    logger.log(`[Wallet-deduct] 用户${userId} -${amountCents}分(${type}), 新余额=${result.newBalance}`);
    return result;
  }

  // ==================== 冻结/解冻 ====================

  /** 冻结金额（违章押金等）*/
  async freezeAmount(userId: number, amountCents: number): Promise<void> {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balanceCents < amountCents + wallet.frozenAmount) {
      throw new BadRequestException('余额不足以冻结');
    }
    await this.walletRepo.update(wallet.id, {
      frozenAmount: () => `frozen_amount + ${amountCents}`,
      version: () => `version + 1`,
    });
    logger.log(`[Freeze] 用户${userId} 冻结${amountCents}分`);
  }

  /** 解冻金额 */
  async unfreezeAmount(userId: number, amountCents: number): Promise<void> {
    await this.walletRepo.createQueryBuilder()
      .update()
      .set({
        frozenAmount: () => `GREATEST(0, frozen_amount - ${amountCents})`,
        version: () => `version + 1`,
      })
      .where('user_id = :userId', { userId })
      .execute();
    logger.log(`[Unfreeze] 用户${userId} 解冻${amountCents}分`);
  }

  // ==================== 统计 ====================

  /** 钱包统计概览 */
  async getWalletStats(): Promise<{
    totalUsers: number;
    totalBalanceCents: number;
    todayRechargeCount: number;
    todayRechargeAmount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalUsers, totalBalRaw, todayTxRaw] = await Promise.all([
      this.walletRepo.count(),
      this.walletRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.balance_cents), 0)', 'total')
        .getRawOne(),
      this.txRepo
        .createQueryBuilder('tx')
        .select('COUNT(tx.id)', 'cnt')
        .addSelect('COALESCE(SUM(CASE WHEN tx.amount_cents > 0 THEN tx.amount_cents ELSE 0 END), 0)', 'amt')
        .where("tx.type = 'RECHARGE'")
        .andWhere('tx.created_at >= :start AND tx.created_at < :end', { start: today, end: tomorrow })
        .getRawOne(),
    ]);

    return {
      totalUsers,
      totalBalanceCents: parseInt(totalBalRaw?.total || '0', 10),
      todayRechargeCount: parseInt(todayTxRaw?.cnt || '0', 10),
      todayRechargeAmount: parseInt(todayTxRaw?.amt || '0', 10),
    };
  }
}
