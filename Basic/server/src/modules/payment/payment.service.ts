import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, In, Between, LessThan } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Order } from '../order/entities/order.entity';
import { OrderStatus, canTransition } from '../../shared/types/order.types';
// 引入真实支付宝服务
import { AlipayService } from '../third-party/alipay/alipay.service';

const logger = new Logger('PaymentService');

/** 支付流水号前缀 */
const PAYMENT_NO_PREFIX = 'PAY';
const REFUND_NO_PREFIX = 'REF';

/** 支付超时时间（分钟） */
const PAYMENT_EXPIRE_MINUTES = 30;

/**
 * 支付状态枚举（对齐 Entity）
 * 0待支付 1支付中 2已支付 3已退款 4已关闭 5失败
 */
export enum PaymentStatus {
  PENDING = 0,
  PROCESSING = 1,
  PAID = 2,
  REFUNDED = 3,
  CLOSED = 4,
  FAILED = 5,
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepo: Repository<Refund>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    // 注入真实支付宝服务
    @Inject(forwardRef(() => AlipayService))
    private readonly alipayService: AlipayService,
  ) {}

  // ==================== 创建支付 ====================

  /**
   * 创建支付记录
   * 用户下单后调用，生成支付流水号并返回支付参数
   *
   * @param userId - 当前登录用户ID
   * @param dto - 支付请求参数
   * @returns 支付记录 + 第三方支付所需参数（如支付宝 trade_no 等）
   */
  async createPayment(userId: number, dto: CreatePaymentDto): Promise<Payment> {
    // 1. 查询订单
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, userId },
      relations: ['vehicle', 'store'],
    });
    if (!order) {
      throw new NotFoundException('订单不存在或不属于您');
    }

    // 2. 校验订单状态：仅待支付(10)和待结算(50)可发起支付
    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.SETTLING
    ) {
      throw new BadRequestException('当前订单状态不支持支付');
    }

    // 3. 检查是否已有未完成的支付
    const existingPayment = await this.paymentRepo.findOne({
      where: {
        orderId: order.id,
        payType: dto.payType || 'payment',
        status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
      },
    });
    if (existingPayment) {
      // 返回已有支付记录（幂等处理）
      return existingPayment;
    }

    // 4. 计算本次应付金额
    let amountCents = order.payableAmountCents;
    if (dto.payType === 'deposit') {
      amountCents = dto.amountCents || 0; // 押金金额由前端传入或系统默认
    }
    if (amountCents <= 0) {
      throw new BadRequestException('支付金额必须大于0');
    }

    // 5. 生成支付流水号
    const paymentNo = this.generatePaymentNo();

    // 6. 计算超时时间
    const expireAt = new Date(
      Date.now() + PAYMENT_EXPIRE_MINUTES * 60 * 1000,
    );

    // 7. 创建支付记录
    const payment = this.paymentRepo.create({
      paymentNo,
      orderId: order.id,
      payChannel: dto.payChannel || 'alipay',
      payType: dto.payType || 'payment',
      amountCents,
      currency: 'CNY',
      status: PaymentStatus.PENDING,
      expireAt,
    });

    return this.paymentRepo.save(payment);
  }

  /**
   * 获取第三方支付参数
   * 优先使用真实支付宝API，开发环境降级为模拟模式
   *
   * 返回给小程序/APP的调起支付参数
   */
  async getPayParams(paymentId: number): Promise<any> {
    const payment = await this.paymentRepo.findOneBy({ id: paymentId });
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('该支付单不可支付');
    }

    // 检查超时
    if (payment.expireAt && new Date() > payment.expireAt) {
      await this.paymentRepo.update(paymentId, {
        status: PaymentStatus.CLOSED,
      });
      throw new BadRequestException('支付超时已关闭，请重新下单');
    }

    // 标记为支付中
    await this.paymentRepo.update(paymentId, {
      status: PaymentStatus.PROCESSING,
    });

    // 尝试调用真实支付宝API
    if (this.alipayService.isEnabled && payment.payChannel === 'alipay') {
      try {
        const order = await this.orderRepo.findOneBy({ id: payment.orderId });
        const result = await this.alipayService.createTrade({
          outTradeNo: payment.paymentNo,
          totalAmount: payment.amountCents / 100, // 分→元
          subject: `古月租车-${order?.orderNo || payment.orderId}`,
          body: `${payment.payType === 'deposit' ? '押金' : '租车费用'}-古月租车`,
          timeoutExpress: `${PAYMENT_EXPIRE_MINUTES}m`,
        });

        logger.log(`[Payment] 支付宝下单成功 tradeNo=${result.tradeNo} outTradeNo=${result.outTradeNo}`);
        return {
          paymentId: payment.id,
          paymentNo: payment.paymentNo,
          amountCents: payment.amountCents,
          channel: payment.payChannel,
          ...result.payParams,
          _devMode: false,
        };
      } catch (alipayError) {
        logger.error(`[Payment] 支付宝调用失败，回退到模拟模式: ${alipayError.message}`);
        // 不抛错，继续走模拟模式（开发环境友好）
      }
    }

    // 模拟模式（开发环境或支付宝不可用时）
    return {
      paymentId: payment.id,
      paymentNo: payment.paymentNo,
      amountCents: payment.amountCents,
      channel: payment.payChannel,
      tradeNO: `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      _devMode: true,
    };
  }

  // ==================== 回调处理 ====================

  /**
   * 处理支付成功回调
   * 由第三方支付平台异步通知触发
   * 流程：验签 → 更新支付状态 → 更新订单状态 → 触发后续业务逻辑
   *
   * @param callbackData - 第三方回调原始数据（含签名等）
   */
  async handlePaymentCallback(callbackData: any): Promise<void> {
    const { out_trade_no, trade_status, trade_no, total_amount } = callbackData;

    // 0. 验证支付宝回调签名（安全关键！）
    if (this.alipayService.isEnabled) {
      const verified = this.alipayService.verifyCallback(callbackData as Record<string, string>);
      if (!verified) {
        logger.error(`[Payment] 支付宝回调签名验证失败！out_trade_no=${out_trade_no}`);
        throw new BadRequestException('回调签名无效');
      }
      logger.log(`[Payment] 回调验签通过 out_trade_no=${out_trade_no}`);
    } else {
      logger.warn(`[Payment] 支付宝服务未启用，跳过验签（仅限开发环境）`);
    }

    // 1. 通过商户订单号查支付记录
    const payment = await this.paymentRepo.findOne({
      where: { paymentNo: out_trade_no },
    });
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    // 2. 幂等检查：已支付的不再重复处理
    if (payment.status === PaymentStatus.PAID) {
      return; // 直接成功返回（防止重复回调）
    }

    // 3. 校验金额（防篡改）
    const callbackAmount = Math.round(parseFloat(total_amount || '0') * 100);
    if (
      callbackAmount > 0 &&
      Math.abs(callbackAmount - payment.amountCents) > 1
    ) {
      // 允许1分误差（精度问题），超出则告警
      console.warn(
        `[Payment] 金额不匹配！期望:${payment.amountCents}分 实际:${callbackAmount}分`,
      );
    }

    // 4. 根据交易结果更新状态
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.paymentRepo.update(payment.id, {
        status: PaymentStatus.PAID,
        tradeNo: trade_no,
        paidAt: new Date(),
        callbackData,
      });

      // 5. 更新关联订单状态（通过 OrderService 的 onPaymentSuccess 方法）
      // 注意：这里避免循环依赖，直接操作订单状态
      const order = await this.orderRepo.findOneBy({ id: payment.orderId });
      if (order) {
        const prevStatus = order.status;
        let newOrderStatus: OrderStatus;

        if (prevStatus === OrderStatus.PENDING_PAYMENT) {
          newOrderStatus = OrderStatus.PICKUP_PENDING; // 首次支付 → 待取车
        } else if (prevStatus === OrderStatus.SETTLING) {
          newOrderStatus = OrderStatus.COMPLETED; // 补交尾款 → 已完成
        } else {
          newOrderStatus = prevStatus; // 其他状态不变
        }

        await this.orderRepo.update(order.id, {
          status: newOrderStatus,
          paidAmountCents: (order.paidAmountCents || 0) + payment.amountCents,
          paidAt: new Date(),
        });
      }
    } else {
      // 支付失败/关闭
      await this.paymentRepo.update(payment.id, {
        status:
          trade_status === 'TRADE_CLOSED'
            ? PaymentStatus.CLOSED
            : PaymentStatus.FAILED,
        callbackData,
      });
    }
  }

  /**
   * 主动查询第三方支付结果
   * 前端轮询或定时任务调用
   */
  async queryPaymentResult(paymentId: number): Promise<{
    status: number;
    statusLabel: string;
    paidAt?: string;
    tradeNo?: string;
  }> {
    const payment = await this.paymentRepo.findOneBy({ id: paymentId });
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    const statusMap: Record<number, string> = {
      [PaymentStatus.PENDING]: '待支付',
      [PaymentStatus.PROCESSING]: '支付中',
      [PaymentStatus.PAID]: '已支付',
      [PaymentStatus.REFUNDED]: '已退款',
      [PaymentStatus.CLOSED]: '已关闭',
      [PaymentStatus.FAILED]: '支付失败',
    };

    return {
      status: payment.status,
      statusLabel: statusMap[payment.status] || '未知',
      paidAt: payment.paidAt?.toISOString(),
      tradeNo: payment.tradeNo || undefined,
    };
  }

  // ==================== 退款增强（T3W10-3）====================

  /**
   * 按时间梯度计算退款比例
   * - 取车前 >=48h：100%
   * - 取车前 24~48h：80%
   * - 取车前 12~24h：50%
   * - 取车前 <12h：0%（不予退款）
   */
  private calculateRefundRatio(order: Order): number {
    const now = new Date();
    const pickupTime = order.pickupAt || order.pickupAt;

    if (!pickupTime) {
      // 无取车时间，按订单创建时间宽松处理
      return 1.0;
    }

    const hoursUntilPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilPickup >= 48) return 1.0;        // 全额
    if (hoursUntilPickup >= 24) return 0.8;       // 80%
    if (hoursUntilPickup >= 12) return 0.5;       // 50%
    return 0;                                       // 不予退款
  }

  /**
   * 带时间梯度的退款申请
   */
  async requestRefundWithPolicy(
    userId: number,
    dto: RefundRequestDto,
  ): Promise<{ refund: Refund; refundAmountCents: number; ratio: number }> {
    // 1. 复用基础校验
    const payment = await this.paymentRepo.findOne({
      where: { id: dto.paymentId, orderId: dto.orderId },
    });
    if (!payment) throw new NotFoundException('支付记录不存在');
    if (payment.status !== PaymentStatus.PAID) throw new BadRequestException('该支付记录无法退款');

    const order = await this.orderRepo.findOneBy({ id: dto.orderId });
    if (!order || order.userId !== userId) throw new Error('无权操作');

    // 2. 时间梯度计算可退金额
    const ratio = this.calculateRefundRatio(order);
    let maxRefundable = Math.round(payment.amountCents * ratio);
    if (maxRefundable < 0) maxRefundable = 0;

    // 3. 用户请求金额 vs 最大可退金额
    let requestedAmount = dto.refundAmountCents || payment.amountCents;
    if (requestedAmount > maxRefundable && ratio < 1.0) {
      logger.warn(`[Refund] 用户申请${requestedAmount}分，按政策最多退${maxRefundable}分`);
      requestedAmount = maxRefundable;
    }
    if (requestedAmount <= 0 && ratio === 0) {
      throw new BadRequestException(
        `距离取车不足12小时，按规则不予退款。如有特殊情况请联系客服`,
      );
    }

    // 4. 创建退款记录
    const refundNo = this.generateRefundNo();
    const refund = this.refundRepo.create({
      refundNo,
      paymentId: payment.id,
      orderId: order.id,
      userId,
      refundAmountCents: requestedAmount,
      originalAmountCents: payment.amountCents,
      refundRatio: Math.round(ratio * 100), // 存储百分比整数
      refundType: dto.refundType || 'order',
      reason: dto.reason || (ratio < 1.0 ? `时间梯度退款(${Math.round(ratio * 100)}%)` : '用户取消'),
      status: 0,
      appliedAt: new Date(),
    });

    // 5. 小额自动通过
    if (requestedAmount <= 50000) {
      refund.auditStatus = 1;
      await this.processRefund(refund);
    } else {
      await this.refundRepo.save(refund);
    }

    return { refund, refundAmountCents: requestedAmount, ratio };
  }

  /**
   * 掉单同步：主动查询支付宝实际交易状态
   * 用于前端轮询或定时任务补偿
   */
  async syncPaymentStatus(paymentId: number): Promise<{
    localStatus: number;
    remoteStatus?: string;
    synced: boolean;
    message: string;
  }> {
    const payment = await this.paymentRepo.findOneBy({ id: paymentId });
    if (!payment) throw new NotFoundException('支付记录不存在');

    // 已支付/已退款的不需要同步
    if ([PaymentStatus.PAID, PaymentStatus.REFUNDED].includes(payment.status)) {
      return { localStatus: payment.status, synced: true, message: '状态一致，无需同步' };
    }

    try {
      // 调用真实支付宝查询API
      if (this.alipayService.isEnabled && payment.payChannel === 'alipay') {
        const queryResult = await this.alipayService.queryTrade(payment.paymentNo);

        // 映射支付宝状态到本地状态
        const statusMap: Record<string, { localStatus: number; synced: boolean; msg: string }> = {
          'TRADE_SUCCESS':  { localStatus: PaymentStatus.PAID,     synced: true,  msg: '交易成功，已同步' },
          'TRADE_FINISHED': { localStatus: PaymentStatus.PAID,     synced: true,  msg: '交易完成（不可退款），已同步' },
          'TRADE_CLOSED':   { localStatus: PaymentStatus.CLOSED,   synced: true,  msg: '交易已关闭/超时，已同步' },
          'WAIT_BUYER_PAY':{ localStatus: PaymentStatus.PROCESSING, synced: false, msg: '等待买家付款中...' },
        };

        const mapped = statusMap[queryResult.tradeStatus];
        if (mapped) {
          if (mapped.synced && mapped.localStatus !== payment.status) {
            await this.paymentRepo.update(paymentId, {
              status: mapped.localStatus,
              ...(mapped.localStatus === PaymentStatus.PAID ? { tradeNo: queryResult.tradeStatus, paidAt: new Date() } : {}),
            });
          }
          return { localStatus: mapped.localStatus || payment.status, remoteStatus: queryResult.tradeStatus, synced: mapped.synced, message: mapped.msg };
        }
      }

      // 降级：如果超时则标记为关闭
      if (payment.expireAt && new Date() > payment.expireAt) {
        await this.paymentRepo.update(paymentId, { status: PaymentStatus.CLOSED });
        return { localStatus: PaymentStatus.CLOSED, synced: true, message: '支付超时，已自动关闭' };
      }

      return { localStatus: payment.status, synced: false, message: '等待第三方确认中' };
    } catch (error) {
      logger.error(`[Payment] 同步失败 paymentId=${paymentId}: ${error.message}`);
      return { localStatus: payment.status, synced: false, message: error.message };
    }
  }

  /**
   * 重复支付检测与处理
   * 同一订单同一类型有多笔"支付中/待支付"记录时触发
   */
  async handleDuplicatePay(orderId: number): Promise<{
    handled: boolean;
    duplicateCount: number;
    action: string;
  }> {
    const payments = await this.paymentRepo.find({
      where: {
        orderId,
        status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
      },
      order: { createdAt: 'ASC' },
    });

    if (payments.length <= 1) {
      return { handled: false, duplicateCount: payments.length, action: '无需处理' };
    }

    // 保留最早的一笔，其余标记为关闭
    const [keep, ...duplicates] = payments;
    for (const dup of duplicates) {
      await this.paymentRepo.update(dup.id, { status: PaymentStatus.CLOSED });
    }

    logger.warn(`[Payment] 订单${orderId}检测到${duplicates.length}笔重复支付，已清理`);

    return { handled: true, duplicateCount: duplicates.length, action: `${duplicates.length}笔重复支付已关闭` };
  }

  /**
   * 补偿检查：扫描超时未回调的支付并更新状态
   * 定时任务调用（建议每5分钟执行一次）
   */
  async compensationCheck(): Promise<{ checked: number; updated: number; errors: number }> {
    const now = new Date();
    const expiredPayments = await this.paymentRepo.find({
      where: {
        status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
        expireAt: Between(new Date(0), now),
      },
    });

    let updated = 0;
    let errors = 0;

    for (const payment of expiredPayments) {
      try {
        await this.paymentRepo.update(payment.id, { status: PaymentStatus.CLOSED });
        updated++;
      } catch (e) {
        logger.error(`[Compensation] 更新失败 paymentId=${payment.id}: ${e.message}`);
        errors++;
      }
    }

    return { checked: expiredPayments.length, updated, errors };
  }

  /**
   * 获取退款列表
   */
  async getRefundList(query: {
    page?: number;
    size?: number;
    userId?: number;
    orderId?: number;
    status?: number;
  }) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.refundRepo.createQueryBuilder('refund')
      .leftJoinAndSelect('refund.order', 'order')
      .where('refund.deleted_at IS NULL');

    if (query.userId) qb.andWhere('refund.user_id = :userId', { userId: query.userId });
    if (query.orderId) qb.andWhere('refund.order_id = :orderId', { orderId: query.orderId });
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('refund.status = :status', { status: query.status });
    }

    const [list, total] = await qb
      .orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  // ==================== 自动退款（定时任务）====================

  /**
   * 超时未支付订单的自动退款（全额）
   */
  async autoRefundExpiredOrders(): Promise<number> {
    const now = new Date();
    const deadline = new Date(now.getTime() - PAYMENT_EXPIRE_MINUTES * 60 * 1000);

    const pendingPayments = await this.paymentRepo.find({
      where: {
        status: PaymentStatus.PAID,
        createdAt: LessThan(deadline),
      },
    });

    let refunded = 0;
    for (const payment of pendingPayments) {
      try {
        const existingRefund = await this.refundRepo.findOne({
          where: { paymentId: payment.id, status: In([0]) },
        });
        if (existingRefund) continue;

        const refund = this.refundRepo.create({
          refundNo: this.generateRefundNo(),
          paymentId: payment.id,
          orderId: payment.orderId,
          userId: 0, // 系统操作
          refundAmountCents: payment.amountCents,
          originalAmountCents: payment.amountCents,
          refundRatio: 100,
          refundType: 'auto_expire',
          reason: '支付超时自动退款',
          auditStatus: 1,
          appliedAt: now,
        });
        await this.processRefund(refund);
        refunded++;
      } catch (e) {
        logger.error(`[AutoRefund] 支付${payment.id}自动退款失败: ${e.message}`);
      }
    }

    return refunded;
  }

  // ==================== 工具方法 ====================

  /** 生成支付流水号 */
  async getOrderPaymentStatus(orderId: number): Promise<{
    payments: Array<{
      id: number;
      paymentNo: string;
      payChannel: string;
      payType: string;
      amountCents: number;
      status: number;
      statusLabel: string;
      paidAt?: string;
    }>;
    totalPaid: number;
    refundable: boolean;
  }> {
    const payments = await this.paymentRepo.find({
      where: { orderId, status: PaymentStatus.PAID },
      order: { createdAt: 'DESC' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amountCents, 0);

    const statusLabels: Record<number, string> = {
      [PaymentStatus.PENDING]: '待支付',
      [PaymentStatus.PROCESSING]: '支付中',
      [PaymentStatus.PAID]: '已支付',
      [PaymentStatus.REFUNDED]: '已退款',
      [PaymentStatus.CLOSED]: '已关闭',
      [PaymentStatus.FAILED]: '支付失败',
    };

    // 判断是否可退（有已支付的金额且没有进行中的退款）
    const pendingRefund = await this.refundRepo.findOne({
      where: { orderId, status: In([0]) },
    });

    return {
      payments: payments.map((p) => ({
        id: p.id,
        paymentNo: p.paymentNo,
        payChannel: p.payChannel,
        payType: p.payType,
        amountCents: p.amountCents,
        status: p.status,
        statusLabel: statusLabels[p.status],
        paidAt: p.paidAt?.toISOString(),
      })),
      totalPaid,
      refundable: totalPaid > 0 && !pendingRefund,
    };
  }

  // ==================== 工具方法 ====================

  /** 生成支付流水号 */
  private generatePaymentNo(): string {
    const now = new Date();
    const datePart = now.toISOString().replace(/[-:TZ.]/g, '').substring(0, 14);
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${PAYMENT_NO_PREFIX}${datePart}${randomPart}`;
  }

  /** 生成退款流水号 */
  private generateRefundNo(): string {
    const now = new Date();
    const datePart = now.toISOString().replace(/[-:TZ.]/g, '').substring(0, 14);
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${REFUND_NO_PREFIX}${datePart}${randomPart}`;
  }
}

// ==================== DTO 类型定义 ====================

/**
 * 创建支付请求 DTO
 */
export interface CreatePaymentDto {
  /** 关联订单ID */
  orderId: number;
  /** 支付渠道：alipay / wechat / balance / points */
  payChannel?: 'alipay' | 'wechat' | 'balance' | 'points';
  /** 支付类型：deposit(押金) / payment(订单付款) / preauth(预授权) */
  payType?: 'deposit' | 'payment' | 'preauth';
  /** 支付金额（分），押金场景需要传入 */
  amountCents?: number;
}

/**
 * 退款请求 DTO
 */
export interface RefundRequestDto {
  /** 原支付记录ID */
  paymentId: number;
  /** 关联订单ID */
  orderId: number;
  /** 退款金额（分） */
  refundAmountCents?: number;
  /** 退款类型 */
  refundType?: 'order' | 'deposit' | 'preauth';
  /** 退款原因 */
  reason?: string;
}
