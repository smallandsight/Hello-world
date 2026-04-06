import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, In } from 'typeorm';
import { InvoiceTitle } from './entities/invoice-title.entity';
import { Invoice } from './entities/invoice.entity';
import { CreateTitleDto, UpdateTitleDto, ApplyInvoiceDto } from './dto/invoice.dto';

const logger = new Logger('InvoiceService');

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceTitle)
    private readonly titleRepo: Repository<InvoiceTitle>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) {}

  // ==================== 抬头管理 ====================

  /** 创建发票抬头 */
  async createTitle(userId: number, dto: CreateTitleDto): Promise<InvoiceTitle> {
    // 企业类型校验必填项
    if (dto.type === 'COMPANY' && (!dto.taxNo || !dto.address)) {
      throw new BadRequestException('企业抬头必须填写税号和地址');
    }

    const title = this.titleRepo.create({
      userId,
      ...dto,
    });

    // 如果设为默认，先取消其他默认
    if (dto.isDefault) {
      await this.titleRepo.update(
        { userId, isDefault: 1 },
        { isDefault: 0 },
      );
    }

    return this.titleRepo.save(title);
  }

  /** 更新发票抬头 */
  async updateTitle(id: number, userId: number, dto: UpdateTitleDto): Promise<InvoiceTitle> {
    const title = await this.titleRepo.findOneBy({ id, userId });
    if (!title) throw new NotFoundException('抬头不存在');

    if (dto.isDefault && !title.isDefault) {
      await this.titleRepo.update({ userId, isDefault: 1 }, { isDefault: 0 });
    }

    Object.assign(title, dto);
    return this.titleRepo.save(title);
  }

  /** 删除抬头 */
  async deleteTitle(id: number, userId: number): Promise<void> {
    const title = await this.titleRepo.findOneBy({ id, userId });
    if (!title) throw new NotFoundException('抬头不存在');

    await this.titleRepo.softDelete(id);
  }

  /** 获取用户的抬头列表 */
  async getTitleList(userId: number): Promise<InvoiceTitle[]> {
    return this.titleRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /** 获取默认抬头 */
  async getDefaultTitle(userId: number): Promise<InvoiceTitle | null> {
    return this.titleRepo.findOne({
      where: { userId, isDefault: 1 },
    });
  }

  // ==================== 发票申请 ====================

  /**
   * 申请开票
   *
   * 校验：
   * 1. 订单必须已完成
   * 2. 每个订单只能开一张发票
   * 3. 抬头必须属于当前用户
   */
  async applyInvoice(userId: number, dto: ApplyInvoiceDto): Promise<Invoice> {
    // 校验抬头
    const title = await this.titleRepo.findOneBy({
      id: dto.titleId,
      userId,
    });
    if (!title) throw new NotFoundException('发票抬头不存在或不属于你');

    // 检查是否已开票
    const existing = await this.invoiceRepo.findOne({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new BadRequestException('该订单已申请过发票');
    }

    // TODO: 验证订单状态（需要注入OrderRepository）
    // const order = await orderRepo.findOneBy({ id: dto.orderId, status: OrderStatus.COMPLETED });

    const invoice = this.invoiceRepo.create({
      userId,
      orderId: dto.orderId,
      titleId: dto.titleId,
      invoiceType: dto.invoiceType || 'ELECTRONIC_NORMAL',
      amountCents: 0, // TODO: 从订单获取实际金额
      status: 'PENDING',
    });

    logger.log(`[Invoice] 用户${userId} 为订单${dto.orderId}申请发票`);
    return this.invoiceRepo.save(invoice);
  }

  /** 获取用户的发票列表 */
  async getInvoiceList(userId: number, query?: { page?: number; size?: number }) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);

    const [list, total] = await this.invoiceRepo.findAndCount({
      where: { userId },
      relations: ['title'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  /** 发票详情 */
  async getInvoiceDetail(id: number, userId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, userId },
      relations: ['title'],
    });
    if (!invoice) throw new NotFoundException('发票记录不存在');
    return invoice;
  }

  // ==================== 商家端操作 ====================

  /**
   * 商家开具发票
   * TODO: 对接税务系统API
   */
  async issueInvoice(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId });
    if (!invoice) throw new NotFoundException('发票记录不存在');
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('仅待开票状态可操作');
    }

    const invoiceNo = `INV_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await this.invoiceRepo.update(invoiceId, {
      status: 'ISSUED',
      invoiceNo,
      issuedAt: new Date(),
    });

    logger.log(`[Issue] 发票#${invoiceId} 已开具, 号码=${invoiceNo}`);
    return this.invoiceRepo.findOneBy({ id: invoiceId });
  }

  /** 标记发票已送达 */
  async markDelivered(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId });
    if (!invoice) throw new NotFoundException('发票记录不存在');
    if (invoice.status !== 'ISSUED') throw new BadRequestException('当前状态不允许此操作');

    await this.invoiceRepo.update(invoiceId, { status: 'DELIVERED' });
    return this.invoiceRepo.findOneBy({ id: invoiceId });
  }

  /** 商家端发票列表（全部）*/
  async getMerchantInvoiceList(query?: {
    page?: number;
    size?: number;
    status?: string;
  }) {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);

    const qb = this.invoiceRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.user', 'user')
      .leftJoinAndSelect('inv.title', 'title')
      .where('inv.deleted_at IS NULL');

    if (query?.status) qb.andWhere('inv.status = :s', { s: query.status });

    const [list, total] = await qb
      .orderBy('inv.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }
}
