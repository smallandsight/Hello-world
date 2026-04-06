import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderLog } from './entities/order-log.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleModel } from '../vehicle/entities/vehicle-model.entity';
import { Store } from '../vehicle/entities/store.entity';
import { UserCoupon } from '../coupon/entities/user-coupon.entity';
import {
  OrderStatus,
  canTransition,
  ORDER_STATUS_LABELS,
} from '../../shared/types/order.types';
import RedisService from '../../common/redis/redis.service';

/** 订单号前缀 */
const ORDER_NO_PREFIX = 'GY';

/** 支付超时时间（分钟） */
const PAYMENT_TIMEOUT_MINUTES = 30;

/** 服务费率（百分比，如 5 表示 5%） */
const SERVICE_FEE_RATE_PERCENT = 5;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderLog)
    private readonly logRepo: Repository<OrderLog>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
    private readonly redisService: RedisService,
  ) {}

  // ==================== 订单创建 ====================

  /**
   * 创建租车订单
   * 完整流程：校验车辆可用性 → 检查时间冲突 → 计算费用 → 生成订单 → 写日志
   */
  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    // 1. 校验车辆存在且可用
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId, isActive: 1 },
      relations: ['model', 'store'],
    });
    if (!vehicle) {
      throw new NotFoundException('车辆不存在或已下架');
    }
    if (vehicle.status !== 1) {
      throw new BadRequestException('该车辆当前不可租用');
    }

    // 2. 校验门店
    const store = vehicle.store;
    if (!store || store.isActive !== 1) {
      throw new BadRequestException('门店不可用');
    }

    // 3. 时间校验
    const pickupTime = new Date(dto.pickupTime);
    const returnTime = new Date(dto.returnTime);
    const now = new Date();

    if (pickupTime <= now) {
      throw new BadRequestException('取车时间必须晚于当前时间');
    }
    if (returnTime <= pickupTime) {
      throw new BadRequestException('还车时间必须晚于取车时间');
    }

    // 最小租赁时长：1小时
    const minDuration = 60 * 60 * 1000; // 1小时（毫秒）
    if (returnTime.getTime() - pickupTime.getTime() < minDuration) {
      throw new BadRequestException('最短租赁时间为1小时');
    }

    // 最大租赁时长：30天
    const maxDuration = 30 * 24 * 60 * 60 * 1000;
    if (returnTime.getTime() - pickupTime.getTime() > maxDuration) {
      throw new BadRequestException('最长租赁时间为30天');
    }

    // 4. 检查该车辆在目标时间段是否已被预订（排除已取消/已完成订单）
    const conflictOrder = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.vehicle_id = :vehicleId', { vehicleId: dto.vehicleId })
      .andWhere('order.status IN (:...activeStatuses)', {
        activeStatuses: [
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.PICKUP_PENDING,
          OrderStatus.IN_USE,
          OrderStatus.RETURN_PENDING,
          OrderStatus.SETTLING,
        ],
      })
      .andWhere('order.pickup_at < :returnTime', { returnTime })
      .andWhere('(order.returned_at IS NULL OR order.returned_at > :pickupTime)', {
        pickupTime,
      })
      .getOne();

    if (conflictOrder) {
      throw new BadRequestException(
        '该车辆在所选时间段已被预订，请选择其他时间段',
      );
    }

    // 5. 费用计算
    const pricing = this.calculatePrice(vehicle.model, pickupTime, returnTime);

    // 6. 处理优惠券抵扣
    let couponDiscountCents = 0;
    let userCouponId: number | null = null;
    if (dto.userCouponId) {
      const couponResult = await this.applyCoupon(
        dto.userCouponId,
        userId,
        pricing.originalAmountCents,
        vehicle.model.id,
        store.id,
      );
      couponDiscountCents = couponResult.discountCents;
      userCouponId = dto.userCouponId;
    }

    // 7. 计算最终应付金额
    const payableAmountCents = Math.max(
      0,
      pricing.originalAmountCents +
        pricing.serviceFeeCents -
        couponDiscountCents -
        (dto.pointsUsed || 0),
    );

    // 8. 生成订单号
    const orderNo = this.generateOrderNo();

    // 9. 创建订单记录
    const order = this.orderRepo.create({
      orderNo,
      userId,
      vehicleId: dto.vehicleId,
      storeId: store.id,
      status: OrderStatus.PENDING_PAYMENT,
      orderedAt: new Date(),
      // 取还车时间
      pickupAt: pickupTime,
      plannedReturnAt: returnTime,
      // 地址信息冗余
      pickupAddress: store.address || `${store.province}${store.city}${store.district || ''}`,
      pickupLat: store.latitude,
      pickupLng: store.longitude,
      // 费用明细
      baseFareCents: pricing.baseFareCents,
      timeSurchargeCents: 0, // 时段附加费暂不实现
      distanceFareCents: 0, // 里程费还车时结算
      memberDiscountCents: 0, // 会员折扣暂不实现
      couponDiscountCents,
      pointsDiscountCents: dto.pointsUsed || 0,
      originalAmountCents: pricing.originalAmountCents,
      payableAmountCents,
      paidAmountCents: 0,
      // 优惠券关联
      userCouponId,
      pointsUsed: dto.pointsUsed || 0,
    });

    const savedOrder = await this.orderRepo.save(order);

    // 10. 写入操作日志
    await this.writeLog(savedOrder.id, 'create', 'user', userId, {
      action: '创建订单',
      vehicleId: dto.vehicleId,
      storeId: store.id,
      pickupTime: dto.pickupTime,
      returnTime: dto.returnTime,
      amountCents: payableAmountCents,
    });

    return savedOrder;
  }

  // ==================== 订单查询 ====================

  /**
   * 获取用户订单列表（分页 + 状态筛选）
   */
  async getOrderList(
    userId: number,
    query: OrderListQueryDto,
  ) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('order.store', 'store')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.deleted_at IS NULL')
      .orderBy('order.createdAt', 'DESC');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    const [list, total] = await qb.skip(skip).take(size).getManyAndCount();

    return {
      list: list.map((o) => this.formatOrderForList(o)),
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 订单详情（含完整关联）
   */
  async getOrderDetail(orderId: number, userId?: number): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: [
        'user',
        'vehicle',
        'vehicle.model',
        'vehicle.store',
        'store',
        'payments',
      ],
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    // 权限校验：只能查看自己的订单（管理员接口可跳过）
    if (userId && order.userId !== userId) {
      throw new ForbiddenException('无权查看此订单');
    }

    return this.formatOrderDetail(order);
  }

  // ==================== 状态变更 ====================

  /**
   * 取消订单
   * 仅待支付(10) / 待取车(20) 状态可取消
   */
  async cancelOrder(
    orderId: number,
    userId: number,
    reason?: string,
  ) {
    const order = await this.findUserOrder(orderId, userId);
    const prevStatus = order.status;

    if (!canTransition(prevStatus, OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        `当前状态(${ORDER_STATUS_LABELS[prevStatus]})无法取消`,
      );
    }

    // 已支付的订单取消需走退款流程
    if (prevStatus === OrderStatus.PICKUP_PENDING) {
      // 触发退款逻辑（由 PaymentService 处理）
      // 这里仅标记状态，实际退款在 PaymentService.requestRefund 中处理
    }

    await this.orderRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason || '用户主动取消',
    });

    await this.writeLog(orderId, 'status_change', 'user', userId, {
      from: prevStatus,
      to: OrderStatus.CANCELLED,
      reason,
    });

    return { message: '订单已取消', orderId };
  }

  /**
   * 确认取车（扫码或手动确认）
   * 状态流转：待取车(20) → 使用中(30)
   */
  async pickupVehicle(orderId: number, userId: number) {
    const order = await this.findUserOrder(orderId, userId);
    const prevStatus = order.status;

    if (!canTransition(prevStatus, OrderStatus.IN_USE)) {
      throw new BadRequestException(
        `当前状态(${ORDER_STATUS_LABELS[prevStatus]})无法确认取车`,
      );
    }

    await this.orderRepo.update(orderId, {
      status: OrderStatus.IN_USE,
      pickedUpAt: new Date(),
    });

    // 更新车辆状态为使用中
    await this.vehicleRepo.update(order.vehicleId, { status: 2 });

    await this.writeLog(orderId, 'pickup', 'user', userId, {
      from: prevStatus,
      to: OrderStatus.IN_USE,
      pickedUpAt: new Date().toISOString(),
    });

    return { message: '取车成功，祝您骑行愉快！', orderId };
  }

  /**
   * 发起还车
   * 状态流转：使用中(30) → 待还车(40)
   */
  async returnVehicle(orderId: number, userId: number, body?: ReturnVehicleDto) {
    const order = await this.findUserOrder(orderId, userId);
    const prevStatus = order.status;

    if (!canTransition(prevStatus, OrderStatus.RETURN_PENDING)) {
      throw new BadRequestException(
        `当前状态(${ORDER_STATUS_LABELS[prevStatus]})无法发起还车`,
      );
    }

    await this.orderRepo.update(orderId, {
      status: OrderStatus.RETURN_PENDING,
      returnRequestedAt: new Date(),
      returnLocationDesc: body?.locationDesc,
      returnLat: body?.lat,
      returnLng: body?.lng,
    });

    await this.writeLog(orderId, 'return', 'user', userId, {
      from: prevStatus,
      to: OrderStatus.RETURN_PENDING,
      location: body?.locationDesc,
      lat: body?.lat,
      lng: body?.lng,
    });

    // 自动触发预结算（进入待结算状态）
    await this.settleOrder(orderId, userId);

    return { message: '还车请求已提交，正在计算费用...', orderId };
  }

  // ==================== 结算 ====================

  /**
   * 预览结算价格（还车时调用，不修改订单状态）
   */
  async previewSettlement(orderId: number, userId: number) {
    const order = await this.findUserOrder(orderId, userId);

    if (
      order.status !== OrderStatus.IN_USE &&
      order.status !== OrderStatus.RETURN_PENDING &&
      order.status !== OrderStatus.SETTLING
    ) {
      throw new BadRequestException('当前状态不支持预览结算');
    }

    // 基于实际使用时间重新计算
    const actualStart = order.pickedUpAt || order.pickupAt || order.orderedAt;
    const actualEnd = new Date();
    const durationMs = actualEnd.getTime() - actualStart.getTime();
    const hours = Math.ceil(durationMs / (1000 * 60 * 60));

    // 获取车型价格
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: order.vehicleId },
      relations: ['model'],
    });
    const model = vehicle!.model;

    // 重新计算基础费用
    let baseFare = model.pricePerHourCents * hours;

    // 日封顶检查
    const days = Math.ceil(hours / 24);
    if (model.dailyCapCents && days > 0) {
      const dailyCapTotal = model.dailyCapCents * days;
      baseFare = Math.min(baseFare, dailyCapTotal);
    }

    // 加上起步价
    const totalBase = baseFare + (model.basePriceCents || 0);

    // 服务费
    const serviceFee = Math.round((totalBase * SERVICE_FEE_RATE_PERCENT) / 100);

    const originalAmount = totalBase + serviceFee;

    // 应付金额（扣除已计算的优惠）
    const payableAmount = Math.max(
      0,
      originalAmount -
        (order.couponDiscountCents || 0) -
        (order.memberDiscountCents || 0) -
        (order.pointsDiscountCents || 0),
    );

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      actualStartTime: actualStart.toISOString(),
      previewEndTime: actualEnd.toISOString(),
      durationHours: hours,
      priceBreakdown: {
        baseFareCents: baseFare,
        serviceFeeCents: serviceFee,
        distanceFareCents: 0,
        originalAmountCents: originalAmount,
        couponDiscountCents: order.couponDiscountCents || 0,
        memberDiscountCents: order.memberDiscountCents || 0,
        pointsDiscountCents: order.pointsDiscountCents || 0,
      },
      payableAmountCents: payableAmount,
      paidAmountCents: order.paidAmountCents || 0,
      refundOrPayCents: payableAmount - (order.paidAmountCents || 0),
    };
  }

  /**
   * 结算订单
   * 内部方法：还车确认后自动调用
   * 流程：计算最终费用 → 更新状态 → 写日志 → 标记优惠券已使用
   */
  private async settleOrder(orderId: number, operatorId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) return;

    const prevStatus = order.status;

    // 使用预览结果作为最终费用（简化版；生产环境应基于GPS里程精确计算）
    const preview = await this.previewSettlement(orderId, order.userId);
    const finalPayable = preview.payableAmountCents;

    // 判断是退钱还是补交
    const paidAlready = order.paidAmountCents || 0;
    const delta = finalPayable - paidAlready;

    await this.orderRepo.update(orderId, {
      status: OrderStatus.SETTLING,
      settledAt: new Date(),
      returnedAt: new Date(),
      baseFareCents: preview.priceBreakdown.baseFareCents,
      originalAmountCents: preview.priceBreakdown.originalAmountCents,
      payableAmountCents: finalPayable,
      durationSeconds: Math.round(
        (new Date().getTime() - (order.pickedUpAt?.getTime() || order.orderedAt?.getTime() || 0)) / 1000,
      ),
    });

    // 标记优惠券为已使用
    if (order.userCouponId) {
      await this.userCouponRepo.update(order.userCouponId, {
        status: 1, // 已使用
        usedAt: new Date(),
        orderId: orderId,
      });
    }

    // 如果差额为0或已全额支付，直接完成
    if (delta <= 0) {
      // 有余额需退回
      await this.orderRepo.update(orderId, {
        status: OrderStatus.COMPLETED,
      });
      await this.writeLog(orderId, 'settle', 'system', null, {
        from: prevStatus,
        to: OrderStatus.COMPLETED,
        finalPayable,
        refundAmount: Math.abs(delta),
      });
    } else {
      // 需要补交费用，保持 SETTLING 状态等待支付
      await this.writeLog(orderId, 'settle', 'system', null, {
        from: prevStatus,
        to: OrderStatus.SETTLING,
        finalPayable,
        amountDue: delta,
      });
    }
  }

  /**
   * 支付成功回调 — 更新订单状态
   * 由 PaymentService 在收到支付成功通知后调用
   */
  async onPaymentSuccess(orderId: number, paymentData: any) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('订单不存在');

    const prevStatus = order.status;

    // 更新实付金额
    const newPaidAmount = (order.paidAmountCents || 0) + paymentData.amountCents;
    await this.orderRepo.update(orderId, {
      paidAmountCents: newPaidAmount,
      paidAt: new Date(),
      // 根据当前状态决定目标状态
      status:
        order.status === OrderStatus.PENDING_PAYMENT
          ? OrderStatus.PICKUP_PENDING
          : order.status === OrderStatus.SETTLING
            ? OrderStatus.COMPLETED
            : order.status,
    });

    const newStatus =
      order.status === OrderStatus.PENDING_PAYMENT
        ? OrderStatus.PICKUP_PENDING
        : order.status === OrderStatus.SETTLING
          ? OrderStatus.COMPLETED
          : order.status;

    await this.writeLog(orderId, 'payment', 'system', null, {
      from: prevStatus,
      to: newStatus,
      amountCents: paymentData.amountCents,
      tradeNo: paymentData.tradeNo,
      channel: paymentData.channel,
    });
  }

  /**
   * 支付超时自动取消
   * 定时任务调用：将超过30分钟未支付的订单自动取消
   */
  async cancelExpiredOrders(): Promise<number> {
    const deadline = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    const result = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: '支付超时自动取消',
      })
      .where('status = :status', { status: OrderStatus.PENDING_PAYMENT })
      .andWhere('ordered_at < :deadline', { deadline })
      .execute();

    const affected = result.affected || 0;
    if (affected > 0) {
      // 日志记录批量取消
      await this.logRepo.insert({
        orderId: 0, // 批量操作标记
        action: 'batch_cancel',
        operatorType: 'system',
        changeContent: { affectedCount: affected, deadline: deadline.toISOString() },
        remark: `支付超时自动取消 ${affected} 个订单`,
      } as any);
    }

    return affected;
  }

  // ==================== 统计 ====================

  /**
   * 统计用户各状态订单数
   */
  async countByStatus(userId: number): Promise<Record<string, number>> {
    const counts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.deleted_at IS NULL')
      .groupBy('order.status')
      .getRawMany();

    const result: Record<string, number> = {};
    for (const s of Object.values(OrderStatus)) {
      result[s] = 0;
    }
    for (const row of counts) {
      result[row.status] = parseInt(row.count, 10);
    }
    return result;
  }

  // ==================== 内部工具方法 ====================

  /**
   * 生成订单号
   * 格式：GY + 年月日时分秒 + 6位随机数
   * 例：GY20260406143052_8A3F2B
   */
  private generateOrderNo(): string {
    const now = new Date();
    const datePart = now
      .toISOString()
      .replace(/[-:TZ]/g, '')
      .substring(0, 14); // 20260406143052
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${ORDER_NO_PREFIX}${datePart}_${randomPart}`;
  }

  /**
   * 价格计算引擎
   * 基于：车型单价 × 租赁时长 + 起步价 → 应用日封顶 → 加服务费
   */
  private calculatePrice(
    model: VehicleModel,
    startTime: Date,
    endTime: Date,
  ): PriceCalculationResult {
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.ceil(durationMs / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    // 基础租金 = 单价 × 小时数
    let baseFare = model.pricePerHourCents * hours;

    // 日封顶规则：每天最多收 dailyCapCents
    if (model.dailyCapCents && days >= 1) {
      const dailyCapTotal = model.dailyCapCents * days;
      baseFare = Math.min(baseFare, dailyCapTotal);
    }

    // 加起步价
    const subtotal = baseFare + (model.basePriceCents || 0);

    // 服务费（固定比例）
    const serviceFee = Math.round((subtotal * SERVICE_FEE_RATE_PERCENT) / 100);

    // 原价总金额
    const originalAmount = subtotal + serviceFee;

    return {
      baseFareCents: baseFare,
      serviceFeeCents: serviceFee,
      originalAmountCents: originalAmount,
      rentalHours: hours,
      rentalDays: days,
    };
  }

  /**
   * 应用优惠券
   * 校验优惠券有效性 → 计算抵扣金额 → 返回结果
   */
  private async applyCoupon(
    userCouponId: number,
    userId: number,
    orderAmountCents: number,
    modelId: number,
    storeId: number,
  ): Promise<{ discountCents: number }> {
    const userCoupon = await this.userCouponRepo.findOne({
      where: { id: userCouponId, userId },
      relations: ['coupon'],
    });

    if (!userCoupon) {
      throw new NotFoundException('优惠券不存在或不属于您');
    }
    if (userCoupon.status !== 0) {
      throw new BadRequestException('该优惠券已使用或已过期');
    }

    const coupon = userCoupon.coupon;
    if (!coupon || coupon.isActive !== 1) {
      throw new BadRequestException('该优惠券已失效');
    }

    // 有效期校验
    const now = new Date();
    if (
      coupon.validType === 'fixed' &&
      ((coupon.validStartAt && now < coupon.validStartAt) ||
        (coupon.validEndAt && now > coupon.validEndAt))
    ) {
      throw new BadRequestException('该优惠券不在有效期内');
    }
    if (
      coupon.validType === 'relative' &&
      userCoupon.validTo &&
      now > userCoupon.validTo
    ) {
      // 标记过期并返回
      await this.userCouponRepo.update(userCouponId, { status: 2 }); // 过期
      throw new BadRequestException('该优惠券已过期');
    }

    // 门槛校验
    if (
      coupon.minOrderAmountCents > 0 &&
      orderAmountCents < coupon.minOrderAmountCents
    ) {
      throw new BadRequestException(
        `订单金额不足${coupon.minOrderAmountCents / 100}元，无法使用此券`,
      );
    }

    // 适用范围校验
    if (coupon.scopeType === 'vehicle_type') {
      const scopeIds: number[] = coupon.scopeValues || [];
      if (!scopeIds.includes(modelId)) {
        throw new BadRequestException('该优惠券不适用于此车型');
      }
    }
    if (coupon.scopeType === 'store') {
      const scopeIds: number[] = coupon.scopeValues || [];
      if (!scopeIds.includes(storeId)) {
        throw new BadRequestException('该优惠券不适用于此门店');
      }
    }

    // 计算抵扣金额
    let discountCents = 0;
    if (coupon.discountType === 'fixed') {
      // 固定金额减免
      discountCents = Math.min(coupon.discountValue, orderAmountCents);
    } else {
      // 折扣类型（85表示85折 → 减免15%）
      const percent = coupon.discountValue / 100;
      discountCents = Math.round(orderAmountCents * (1 - percent));

      // 最大抵扣限制
      if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
        discountCents = coupon.maxDiscountCents;
      }
    }

    return { discountCents };
  }

  /**
   * 查找用户的订单（带权限校验）
   */
  private async findUserOrder(orderId: number, userId: number): Promise<Order> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('此订单不属于您');
    }
    return order;
  }

  /**
   * 写入订单操作日志
   */
  private async writeLog(
    orderId: number,
    action: string,
    operatorType: 'user' | 'system' | 'staff',
    operatorId: number | null,
    changeContent?: any,
    remark?: string,
  ): Promise<OrderLog> {
    const log = this.logRepo.create({
      orderId,
      action,
      operatorType,
      operatorId,
      changeContent,
      remark,
    } as any);
    return this.logRepo.save(log);
  }

  /**
   * 格式化订单列表项（精简版，不含敏感信息）
   */
  private formatOrderForList(order: Order): any {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] || '未知',
      vehicleName: order.vehicle?.model?.modelName || '未知车型',
      vehicleImage: order.vehicle?.model?.coverImageUrl || '',
      storeName: order.store?.storeName || '',
      pickupTime: order.pickupAt?.toISOString(),
      plannedReturnTime: order.plannedReturnAt?.toISOString(),
      payableAmountCents: order.payableAmountCents,
      paidAmountCents: order.paidAmountCents,
      createdAt: order.createdAt.toISOString(),
    };
  }

  /**
   * 格式化订单详情（完整版）
   */
  private formatOrderDetail(order: Order): any {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] || '未知',
      // 关联信息
      vehicle: order.vehicle
        ? {
            id: order.vehicle.id,
            vehicleNo: order.vehicle.vehicleNo,
            model: order.vehicle.model
              ? {
                  modelName: order.vehicle.model.modelName,
                  brand: order.vehicle.model.brand,
                  coverImage: order.vehicle.model.coverImageUrl,
                }
              : null,
          }
        : null,
      store: order.store
        ? {
            id: order.store.id,
            storeName: order.store.storeName,
            address: `${order.store.province}${order.store.city}${order.store.district || ''}${order.store.address}`,
            phone: order.store.phone,
          }
        : null,
      // 时间节点
      orderedAt: order.orderedAt?.toISOString(),
      paidAt: order.paidAt?.toISOString(),
      pickedUpAt: order.pickedUpAt?.toISOString(),
      returnRequestedAt: order.returnRequestedAt?.toISOString(),
      returnedAt: order.returnedAt?.toISOString(),
      settledAt: order.settledAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
      // 地点
      pickupAddress: order.pickupAddress,
      returnLocationDesc: order.returnLocationDesc,
      // 费用明细
      priceDetail: {
        baseFareCents: order.baseFareCents,
        timeSurchargeCents: order.timeSurchargeCents,
        distanceFareCents: order.distanceFareCents,
        memberDiscountCents: order.memberDiscountCents,
        couponDiscountCents: order.couponDiscountCents,
        pointsDiscountCents: order.pointsDiscountCents,
        otherDiscountCents: order.otherDiscountCents,
        originalAmountCents: order.originalAmountCents,
        payableAmountCents: order.payableAmountCents,
        paidAmountCents: order.paidAmountCents,
      },
      // 骑行数据
      durationSeconds: order.durationSeconds,
      distanceMeters: order.distanceMeters,
      // 优惠
      couponUsed: !!order.userCouponId,
      pointsUsed: order.pointsUsed,
      // 取消/异常信息
      cancelReason: order.cancelReason,
      abnormalType: order.abnormalType,
      // 支付记录
      payments: (order.payments || []).map((p) => ({
        paymentNo: p.paymentNo,
        payChannel: p.payChannel,
        amountCents: p.amountCents,
        status: p.status,
        paidAt: p.paidAt?.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}

// ==================== DTO 类型定义 ====================

/**
 * 创建订单请求 DTO
 */
export interface CreateOrderDto {
  /** 车辆ID */
  vehicleId: number;
  /** 取车时间（ISO 8601） */
  pickupTime: string;
  /** 还车时间（ISO 8601） */
  returnTime: string;
  /** 用户优惠券ID（可选） */
  userCouponId?: number;
  /** 使用积分数量（可选，100积分=1元） */
  pointsUsed?: number;
}

/**
 * 订单列表查询 DTO
 */
export interface OrderListQueryDto {
  page?: number;
  size?: number;
  /** 订单状态（可选筛选） */
  status?: OrderStatus | number;
}

/**
 * 还车请求 DTO
 */
export interface ReturnVehicleDto {
  /** 还车位置纬度 */
  lat?: number;
  /** 还车位置经度 */
  lng?: number;
  /** 还车位置文字描述 */
  locationDesc?: string;
}

/**
 * 价格计算结果
 */
interface PriceCalculationResult {
  baseFareCents: number;
  serviceFeeCents: number;
  originalAmountCents: number;
  rentalHours: number;
  rentalDays: number;
}
