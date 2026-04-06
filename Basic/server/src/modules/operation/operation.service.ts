import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { InjectRedis } from '../../common/redis/redis.module';
import Redis from 'ioredis';
import { ExceptionLog, ExceptionType, ExceptionStatus, SOPDefinition } from './entities/exception-log.entity';
import { VehicleTransfer, TransferStatus } from './entities/vehicle-transfer.entity';
import { MessageTemplate, MessageType } from './entities/message-template.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Store } from '../store/entities/store.entity';

/**
 * 运营工具服务
 * 包含异常处理SOP、车辆调配、批量操作、消息模板等功能
 */
@Injectable()
export class OperationService {
  private readonly logger = new Logger(OperationService.name);

  /** SOP定义库 */
  private readonly sopDefinitions: SOPDefinition[] = [
    {
      id: 'SOP001',
      type: ExceptionType.OVERDUE_PICKUP,
      name: '超时未取处理流程',
      description: '用户下单超过30分钟未取车的处理流程',
      timeout: 1,
      priority: 4,
      steps: [
        { step: 1, action: '提醒用户', description: '发送取车提醒通知', timeout: 0.5 },
        { step: 2, action: '电话联系', description: '人工电话联系用户确认', timeout: 0.5 },
        { step: 3, action: '改期处理', description: '如用户需要，协助改期', timeout: 0 },
        { step: 4, action: '取消订单', description: '无法联系时自动取消并退款', timeout: 0 },
      ],
    },
    {
      id: 'SOP002',
      type: ExceptionType.OVERDUE_RETURN,
      name: '长期未还处理流程',
      description: '超过预计还车时间24小时的处理流程',
      timeout: 2,
      priority: 5,
      steps: [
        { step: 1, action: '发送提醒', description: '发送还车提醒通知', timeout: 0.5 },
        { step: 2, action: '电话联系', description: '人工电话联系确认原因', timeout: 1 },
        { step: 3, action: '延长租期', description: '如需延长，协助续租', timeout: 0 },
        { step: 4, action: '报警处理', description: '超过72小时联系警方', timeout: 0 },
      ],
    },
    {
      id: 'SOP003',
      type: ExceptionType.PAYMENT_FAILED,
      name: '支付失败处理流程',
      description: '支付失败订单的处理流程',
      timeout: 0.5,
      priority: 3,
      steps: [
        { step: 1, action: '重试支付', description: '引导用户重试支付', timeout: 0.25 },
        { step: 2, action: '换支付方式', description: '建议更换支付方式', timeout: 0.25 },
        { step: 3, action: '人工处理', description: '后台人工确认支付状态', timeout: 0 },
      ],
    },
    {
      id: 'SOP004',
      type: ExceptionType.VEHICLE_MALFUNCTION,
      name: '车辆故障处理流程',
      description: '车辆故障导致无法正常使用的处理流程',
      timeout: 1,
      priority: 4,
      steps: [
        { step: 1, action: '联系用户', description: '了解故障情况', timeout: 0.25 },
        { step: 2, action: '救援安排', description: '安排道路救援', timeout: 0.5 },
        { step: 3, action: '换车处理', description: '提供替换车辆', timeout: 0.25 },
        { step: 4, action: '退款补偿', description: '计算退款和补偿', timeout: 0 },
      ],
    },
    {
      id: 'SOP005',
      type: ExceptionType.USER_COMPLAINT,
      name: '用户投诉处理流程',
      description: '用户投诉的处理流程',
      timeout: 4,
      priority: 3,
      steps: [
        { step: 1, action: '记录投诉', description: '详细记录投诉内容', timeout: 0.5 },
        { step: 2, action: '调查核实', description: '调查事件经过', timeout: 2 },
        { step: 3, action: '回复用户', description: '向用户反馈处理结果', timeout: 1 },
        { step: 4, action: '赔偿处理', description: '如需赔偿，执行赔偿', timeout: 0.5 },
      ],
    },
    {
      id: 'SOP006',
      type: ExceptionType.TRAFFIC_VIOLATION,
      name: '违章处理流程',
      description: '车辆违章的处理流程',
      timeout: 168, // 7天
      priority: 2,
      steps: [
        { step: 1, action: '通知用户', description: '发送违章通知', timeout: 24 },
        { step: 2, action: '确认处理', description: '用户确认处理方式', timeout: 48 },
        { step: 3, action: '扣款处理', description: '从押金扣除违章费用', timeout: 48 },
        { step: 4, action: '更新记录', description: '更新违章处理状态', timeout: 48 },
      ],
    },
    {
      id: 'SOP007',
      type: ExceptionType.DEPOSIT_DISPUTE,
      name: '押金纠纷处理流程',
      description: '押金退还纠纷的处理流程',
      timeout: 24,
      priority: 4,
      steps: [
        { step: 1, action: '记录纠纷', description: '详细记录纠纷原因', timeout: 2 },
        { step: 2, action: '协商处理', description: '与用户协商解决方案', timeout: 12 },
        { step: 3, action: '仲裁介入', description: '协商不成引入第三方仲裁', timeout: 10 },
        { step: 4, action: '执行裁决', description: '执行最终裁决结果', timeout: 0 },
      ],
    },
    {
      id: 'SOP008',
      type: ExceptionType.REVIEW_DISPUTE,
      name: '评价争议处理流程',
      description: '商家对用户评价有异议的处理流程',
      timeout: 24,
      priority: 2,
      steps: [
        { step: 1, action: '核实情况', description: '调查评价真实性', timeout: 8 },
        { step: 2, action: '回复用户', description: '商家正式回复', timeout: 8 },
        { step: 3, action: '隐藏评价', description: '如评价不当，隐藏处理', timeout: 8 },
      ],
    },
    {
      id: 'SOP009',
      type: ExceptionType.INVOICE_ISSUE,
      name: '发票问题处理流程',
      description: '发票开具相关问题的处理流程',
      timeout: 8,
      priority: 2,
      steps: [
        { step: 1, action: '核实信息', description: '核实发票信息', timeout: 2 },
        { step: 2, action: '补开发票', description: '补开或重开发票', timeout: 4 },
        { step: 3, action: '作废处理', description: '如需作废，执行作废', timeout: 2 },
      ],
    },
    {
      id: 'SOP010',
      type: ExceptionType.DATA_ABNORMAL,
      name: '数据异常处理流程',
      description: '系统数据异常的处理流程',
      timeout: 1,
      priority: 5,
      steps: [
        { step: 1, action: '标记异常', description: '标记异常数据', timeout: 0.25 },
        { step: 2, action: '核查原因', description: '排查异常原因', timeout: 0.5 },
        { step: 3, action: '修复数据', description: '修复数据问题', timeout: 0.25 },
      ],
    },
  ];

  constructor(
    @InjectRepository(ExceptionLog)
    private exceptionRepo: Repository<ExceptionLog>,
    @InjectRepository(VehicleTransfer)
    private transferRepo: Repository<VehicleTransfer>,
    @InjectRepository(MessageTemplate)
    private templateRepo: Repository<MessageTemplate>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRedis() private redis: Redis,
  ) {}

  // ==================== 异常处理SOP ====================

  /**
   * 创建异常记录
   */
  async createException(data: Partial<ExceptionLog>): Promise<ExceptionLog> {
    // 获取对应SOP定义
    const sop = this.sopDefinitions.find(s => s.type === data.type);
    if (!sop) {
      throw new BadRequestException('未找到对应的SOP定义');
    }

    const exception = this.exceptionRepo.create({
      ...data,
      sopId: sop.id,
      priority: sop.priority,
      timeoutHours: sop.timeout,
      processFlow: sop.steps.map(s => ({
        step: s.step,
        action: s.action,
        description: s.description,
      })),
      currentStep: 0,
    });

    return this.exceptionRepo.save(exception);
  }

  /**
   * 处理异常下一步
   */
  async processExceptionStep(
    exceptionId: string,
    handlerId: string,
    handlerName: string,
    result: string,
    remark?: string,
  ): Promise<ExceptionLog> {
    const exception = await this.exceptionRepo.findOne({ where: { id: exceptionId } });
    if (!exception) {
      throw new NotFoundException('异常记录不存在');
    }

    if (exception.status === ExceptionStatus.RESOLVED) {
      throw new BadRequestException('异常已解决，无法继续处理');
    }

    // 更新当前步骤
    exception.currentStep++;
    exception.handlerId = handlerId;
    exception.handlerName = handlerName;
    exception.result = result;
    exception.remark = remark;

    // 更新流程记录
    const flow = exception.processFlow || [];
    if (flow[exception.currentStep - 1]) {
      flow[exception.currentStep - 1].handler = handlerName;
      flow[exception.currentStep - 1].handledAt = new Date();
      flow[exception.currentStep - 1].result = result;
    }

    // 检查是否完成所有步骤
    const sop = this.sopDefinitions.find(s => s.id === exception.sopId);
    if (sop && exception.currentStep >= sop.steps.length) {
      exception.status = ExceptionStatus.RESOLVED;
      exception.resolvedAt = new Date();
    } else {
      exception.status = ExceptionStatus.PROCESSING;
    }

    return this.exceptionRepo.save(exception);
  }

  /**
   * 获取异常列表
   */
  async getExceptions(options?: {
    type?: ExceptionType;
    status?: ExceptionStatus;
    orderId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: ExceptionLog[]; total: number }> {
    const { type, status, orderId, page = 1, pageSize = 20 } = options || {};

    const query = this.exceptionRepo.createQueryBuilder('e');

    if (type) {
      query.andWhere('e.type = :type', { type });
    }

    if (status) {
      query.andWhere('e.status = :status', { status });
    }

    if (orderId) {
      query.andWhere('e.orderId = :orderId', { orderId });
    }

    query.orderBy('e.priority', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await query.getManyAndCount();

    return { list, total };
  }

  /**
   * 获取异常详情
   */
  async getExceptionDetail(id: string): Promise<ExceptionLog> {
    const exception = await this.exceptionRepo.findOne({ where: { id } });
    if (!exception) {
      throw new NotFoundException('异常记录不存在');
    }
    return exception;
  }

  /**
   * 扫描并创建异常
   */
  async scanExceptions(): Promise<ExceptionLog[]> {
    const exceptions: ExceptionLog[] = [];
    const now = new Date();

    // 1. 检查超时未取
    const overduePickup = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThanOrEqual(new Date(now.getTime() - 30 * 60 * 1000)),
      },
    });

    for (const order of overduePickup) {
      const existing = await this.exceptionRepo.findOne({
        where: { orderId: order.id, type: ExceptionType.OVERDUE_PICKUP },
      });
      if (!existing) {
        const exception = await this.createException({
          type: ExceptionType.OVERDUE_PICKUP,
          orderId: order.id,
          userId: order.userId,
          title: `订单${order.orderNo}超时未取`,
          description: `用户下单已超过30分钟未取车`,
          triggerConditions: { timeoutMinutes: 30 },
          exceptionData: { orderNo: order.orderNo, createdAt: order.createdAt },
        });
        exceptions.push(exception);
      }
    }

    // 2. 检查长期未还
    const overdueReturn = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.IN_USE })
      .andWhere('order.expectedReturnAt < :deadline', {
        deadline: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      })
      .getMany();

    for (const order of overdueReturn) {
      const existing = await this.exceptionRepo.findOne({
        where: { orderId: order.id, type: ExceptionType.OVERDUE_RETURN },
      });
      if (!existing) {
        const exception = await this.createException({
          type: ExceptionType.OVERDUE_RETURN,
          orderId: order.id,
          userId: order.userId,
          vehicleId: order.vehicleId,
          title: `订单${order.orderNo}长期未还`,
          description: `超过预计还车时间24小时`,
          triggerConditions: { overdueHours: 24 },
          exceptionData: { orderNo: order.orderNo, expectedReturnAt: order.expectedReturnAt },
        });
        exceptions.push(exception);
      }
    }

    // 3. 更新超时状态
    await this.updateTimeoutExceptions();

    return exceptions;
  }

  /**
   * 更新超时异常
   */
  private async updateTimeoutExceptions(): Promise<void> {
    const now = new Date();
    const pending = await this.exceptionRepo.find({
      where: { status: In([ExceptionStatus.PENDING, ExceptionStatus.PROCESSING]) },
    });

    for (const exception of pending) {
      const hoursPassed = (now.getTime() - exception.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursPassed > exception.timeoutHours && !exception.isTimeout) {
        exception.isTimeout = true;
        await this.exceptionRepo.save(exception);
      }
    }
  }

  /**
   * 获取SOP定义列表
   */
  getSOPDefinitions(): SOPDefinition[] {
    return this.sopDefinitions;
  }

  // ==================== 车辆调配管理 ====================

  /**
   * 创建调拨单
   */
  async createTransfer(data: Partial<VehicleTransfer>): Promise<VehicleTransfer> {
    // 生成调拨单号
    const transferNo = await this.generateTransferNo();

    // 获取门店名称
    const fromStore = await this.storeRepo.findOne({ where: { id: data.fromStoreId } });
    const toStore = await this.storeRepo.findOne({ where: { id: data.toStoreId } });

    // 获取车辆信息
    const vehicle = await this.vehicleRepo.findOne({ where: { id: data.vehicleId } });

    const transfer = this.transferRepo.create({
      ...data,
      transferNo,
      fromStoreName: fromStore?.name,
      toStoreName: toStore?.name,
      plateNumber: vehicle?.plateNumber,
    });

    return this.transferRepo.save(transfer);
  }

  /**
   * 审批调拨单
   */
  async approveTransfer(
    id: string,
    approverId: string,
    approverName: string,
    remark?: string,
  ): Promise<VehicleTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('调拨单不存在');
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('调拨单状态不正确');
    }

    transfer.status = TransferStatus.APPROVED;
    transfer.approverId = approverId;
    transfer.approverName = approverName;
    transfer.approvedAt = new Date();
    transfer.approveRemark = remark;

    return this.transferRepo.save(transfer);
  }

  /**
   * 开始调拨
   */
  async startTransfer(id: string, handlerId: string, handlerName: string): Promise<VehicleTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('调拨单不存在');
    }

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new BadRequestException('调拨单未审批');
    }

    transfer.status = TransferStatus.IN_TRANSIT;
    transfer.handlerId = handlerId;
    transfer.handlerName = handlerName;
    transfer.departedAt = new Date();

    return this.transferRepo.save(transfer);
  }

  /**
   * 完成调拨
   */
  async completeTransfer(id: string): Promise<VehicleTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('调拨单不存在');
    }

    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException('调拨单未在途中');
    }

    transfer.status = TransferStatus.COMPLETED;
    transfer.arrivedAt = new Date();

    // 更新车辆所属门店
    await this.vehicleRepo.update(transfer.vehicleId, {
      storeId: transfer.toStoreId,
    });

    return this.transferRepo.save(transfer);
  }

  /**
   * 取消调拨
   */
  async cancelTransfer(id: string, reason: string): Promise<VehicleTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('调拨单不存在');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('调拨已完成，无法取消');
    }

    transfer.status = TransferStatus.CANCELLED;
    transfer.remark = reason;

    return this.transferRepo.save(transfer);
  }

  /**
   * 获取调拨单列表
   */
  async getTransfers(options?: {
    status?: TransferStatus;
    fromStoreId?: string;
    toStoreId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: VehicleTransfer[]; total: number }> {
    const { status, fromStoreId, toStoreId, page = 1, pageSize = 20 } = options || {};

    const query = this.transferRepo.createQueryBuilder('t');

    if (status) {
      query.andWhere('t.status = :status', { status });
    }

    if (fromStoreId) {
      query.andWhere('t.fromStoreId = :fromStoreId', { fromStoreId });
    }

    if (toStoreId) {
      query.andWhere('t.toStoreId = :toStoreId', { toStoreId });
    }

    query.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await query.getManyAndCount();

    return { list, total };
  }

  // ==================== 批量操作工具 ====================

  /**
   * 批量上架车辆
   */
  async batchPublishVehicles(
    vehicleIds: string[],
    operatorId: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const vehicleId of vehicleIds) {
      try {
        await this.vehicleRepo.update(vehicleId, { status: 'available' });
        success++;
      } catch (e) {
        this.logger.error(`批量上架失败: ${vehicleId}`, e);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 批量下架车辆
   */
  async batchUnpublishVehicles(
    vehicleIds: string[],
    operatorId: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const vehicleId of vehicleIds) {
      try {
        await this.vehicleRepo.update(vehicleId, { status: 'unavailable' });
        success++;
      } catch (e) {
        this.logger.error(`批量下架失败: ${vehicleId}`, e);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 批量调价
   */
  async batchAdjustPrice(
    modelIds: string[],
    adjustmentPercent: number,
    operatorId: string,
  ): Promise<{ success: number; failed: number }> {
    // TODO: 实现批量调价逻辑
    return { success: modelIds.length, failed: 0 };
  }

  /**
   * 批量发送通知
   */
  async batchSendNotification(
    userIds: string[],
    title: string,
    content: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // TODO: 调用消息服务发送

    return { success, failed };
  }

  // ==================== 消息模板管理 ====================

  /**
   * 创建消息模板
   */
  async createTemplate(data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  /**
   * 更新消息模板
   */
  async updateTemplate(id: string, data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  /**
   * 获取消息模板列表
   */
  async getTemplates(options?: {
    type?: MessageType;
    status?: boolean;
  }): Promise<MessageTemplate[]> {
    const query = this.templateRepo.createQueryBuilder('t');

    if (options?.type) {
      query.andWhere('t.type = :type', { type: options.type });
    }

    if (options?.status !== undefined) {
      query.andWhere('t.status = :status', { status: options.status });
    }

    query.orderBy('t.sort', 'DESC').addOrderBy('t.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * 预览模板渲染
   */
  async previewTemplate(code: string, variables: Record<string, string>): Promise<{
    title: string;
    content: string;
  }> {
    const template = await this.templateRepo.findOne({ where: { code } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    let title = template.title;
    let content = template.content;

    // 替换变量
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      title = title.replace(regex, value);
      content = content.replace(regex, value);
    }

    return { title, content };
  }

  // ==================== 自动报告 ====================

  /**
   * 生成日报
   */
  async generateDailyReport(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];

    // 获取当日统计数据
    const orders = await this.orderRepo.count({
      where: {
        createdAt: Between(
          new Date(`${date} 00:00:00`),
          new Date(`${date} 23:59:59`),
        ),
      },
    });

    // TODO: 发送日报通知

    this.logger.log(`日报已生成: ${date}, 订单数: ${orders}`);
  }

  /**
   * 生成周报
   */
  async generateWeeklyReport(): Promise<void> {
    // TODO: 实现周报生成
    this.logger.log('周报已生成');
  }

  /**
   * 生成月报
   */
  async generateMonthlyReport(): Promise<void> {
    // TODO: 实现月报生成
    this.logger.log('月报已生成');
  }

  // ==================== 辅助方法 ====================

  private async generateTransferNo(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const key = `transfer:no:${dateStr}`;
    const seq = await this.redis.incr(key);
    await this.redis.expire(key, 86400);
    return `TF${dateStr}${String(seq).padStart(6, '0')}`;
  }
}