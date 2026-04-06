import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Like, In, LessThan, MoreThanOrEqual } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';
import { CreateTicketDto, QueryTicketDto } from './dto/ticket.dto';

const logger = new Logger('TicketService');

/** 工单状态枚举 */
export enum TicketStatus {
  PENDING = 0,        // 待受理
  PROCESSING = 1,     // 处理中
  WAITING_USER = 2,    // 等待用户回复
  RESOLVED = 3,       // 已解决
  REJECTED = -1,       // 已拒绝
  CLOSED = -2,         // 已关闭
  REOPENED = 4,        // 重新打开(转回处理中)
}

/** 合法状态转换映射 */
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TicketStatus.PENDING]: [TicketStatus.PROCESSING, TicketStatus.REJECTED],
  [TicketStatus.PROCESSING]: [TicketStatus.RESOLVED, TicketStatus.WAITING_USER, TicketStatus.CLOSED],
  [TicketStatus.WAITING_USER]: [TicketStatus.PROCESSING, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.REJECTED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [TicketStatus.PROCESSING],
};

/** SLA 响应时限配置（小时） */
const SLA_CONFIG: Record<string, { response: number; resolve: number }> = {
  accident:    { response: 0.5, resolve: 4 },
  payment:     { response: 2, resolve: 8 },
  order_issue: { response: 2, resolve: 8 },
  refund:      { response: 4, resolve: 24 },
  vehicle:     { response: 4, resolve: 24 },
  account:     { response: 8, resolve: 24 },
  suggestion:  { response: 24, resolve: 72 },
  other:       { response: 24, resolve: 72 },
};

/** 升级级别阈值（倍数 × 基础SLA） */
const ESCALATION_MULTIPLIERS = [
  { level: 1, label: 'L1→L2', responseMult: 1.0, resolveMult: 1.0 },   // 超响应时限
  { level: 2, label: 'L2→L3', responseMult: 2.0, resolveMult: 2.0 },   // 超解决时限×2
  { level: 3, label: 'L3→L4', responseMult: 3.0, resolveMult: 3.0 },   // 超解决时限×3
];

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketReply)
    private readonly replyRepo: Repository<TicketReply>,
  ) {}

  // ==================== 用户端：工单操作 ====================

  /**
   * 创建工单
   * 自动设置优先级、SLA截止时间、生成编号
   */
  async createTicket(userId: number, dto: CreateTicketDto): Promise<Ticket> {
    const sla = SLA_CONFIG[dto.ticketType] || SLA_CONFIG.other;
    const now = new Date();

    const ticket = this.ticketRepo.create({
      userId,
      ticketType: dto.ticketType || 'problem',
      title: dto.title,
      content: dto.content,
      orderId: dto.orderId || null,
      priority: this.resolvePriority(dto.ticketType),
      status: TicketStatus.PENDING,
      images: dto.images || null,
      responseDeadlineAt: new Date(now.getTime() + sla.response * 60 * 60 * 1000),
    });

    const saved = await this.ticketRepo.save(ticket);
    logger.log(`[Ticket] 用户${userId}创建工单#${saved.id} 类型=${saved.ticketType}`);
    return saved;
  }

  /**
   * 获取用户的工单列表
   */
  async getUserTickets(userId: number, query: QueryTicketDto) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.ticketRepo.createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.deleted_at IS NULL');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.ticketType) {
      qb.andWhere('t.ticket_type = :type', { type: query.ticketType });
    }
    if (query.keyword) {
      qb.andWhere('(t.title LIKE :kw OR t.content LIKE :kw)', { kw: `%${query.keyword}%` });
    }

    const [list, total] = await qb
      .orderBy('t.priority', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list, total, page, size, pages: Math.ceil(total / size) };
  }

  /**
   * 工单详情（含回复列表）
   */
  async getTicketDetail(ticketId: number, userId?: number) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('工单不存在');
    if (userId && ticket.userId !== userId) throw new Error('无权查看此工单');

    const replies = await this.replyRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    return { ...this.formatTicket(ticket), replies };
  }

  /**
   * 用户追加回复（自动将状态从 CLOSED/RESOLVED → REOPENED → PROCESSING）
   */
  async addReply(ticketId: number, userId: number, content: string, images?: any) {
    const ticket = await this.ticketRepo.findOneBy({ id: ticketId });
    if (!ticket) throw new NotFoundException('工单不存在');
    if (ticket.userId !== userId) throw new Error('无权操作此工单');

    // 如果已关闭或已解决，自动重新打开
    if ([TicketStatus.CLOSED, TicketStatus.RESOLVED].includes(ticket.status)) {
      await this.changeStatus(ticketId, TicketStatus.REOPENED, 'system', '用户追加回复，自动重开');
    }
    // 如果在等待用户回复，切回处理中
    if (ticket.status === TicketStatus.WAITING_USER) {
      await this.changeStatus(ticketId, TicketStatus.PROCESSING, 'system', '用户已回复');
    }

    const reply = this.replyRepo.create({
      ticketId,
      replyerType: 'user',
      replyerId: userId,
      content,
      images: images || null,
    });

    return this.replyRepo.save(reply);
  }

  // ==================== 商家端：工单管理 ====================

  /**
   * 商家端工单列表（全量）
   */
  async listAllTickets(query: QueryTicketDto) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);

    const qb = this.ticketRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.replies', 'replies')
      .where('t.deleted_at IS NULL');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.ticketType) {
      qb.andWhere('t.ticket_type = :type', { type: query.ticketType });
    }
    if (query.priority) {
      qb.andWhere('t.priority = :priority', { priority: query.priority });
    }
    if (query.assigneeId) {
      qb.andWhere('t.assignee_id = :assigneeId', { assigneeId: query.assigneeId });
    }
    if (query.keyword) {
      qb.andWhere('(t.title LIKE :kw OR t.content LIKE :kw OR t.ticket_no LIKE :kw)', { kw: `%${query.keyword}%` });
    }

    const [list, total] = await qb
      .orderBy('t.priority', 'DESC')
      .addOrderBy('t.createdAt', 'ASC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { list: list.map((t) => this.formatTicket(t)), total, page, size, pages: Math.ceil(total / size) };
  }

  /**
   * 分派员工处理工单
   */
  async assignStaff(ticketId: number, staffId: number) {
    const ticket = await this.ticketRepo.findOneBy({ id: ticketId });
    if (!ticket) throw new NotFoundException('工单不存在');

    const prevAssignee = ticket.assigneeId;

    await this.ticketRepo.update(ticketId, {
      assigneeId: staffId,
      status: ticket.status === TicketStatus.PENDING ? TicketStatus.PROCESSING : ticket.status,
      firstResponseAt: !ticket.firstResponseAt ? new Date() : ticket.firstResponseAt,
    });

    // 添加系统回复记录
    await this.addSystemReply(ticketId, `工单已分派给客服 #${staffId}`);

    return {
      message: '工单已分派',
      ticketId,
      previousAssignee: prevAssignee,
      newAssignee: staffId,
    };
  }

  /**
   * 变更工单状态（带状态机校验）
   */
  async changeStatus(
    ticketId: number,
    newStatus: number | TicketStatus,
    operatorType: 'staff' | 'system',
    operatorId?: number,
    remark?: string,
  ) {
    const ticket = await this.ticketRepo.findOneBy({ id: ticketId });
    if (!ticket) throw new NotFoundException('工单不存在');

    const currentStatus = ticket.status;
    const validTargets = VALID_TRANSITIONS[currentStatus];
    if (!validTargets || !validTargets.includes(newStatus as number)) {
      throw new BadRequestException(
        `非法状态变更：${currentStatus} → ${newStatus}`,
      );
    }

    await this.ticketRepo.update(ticketId, { status: newStatus as any });

    // 记录操作日志
    await this.addSystemReply(
      ticketId,
      `状态变更：${currentStatus} → ${newStatus}${remark ? ` (${remark})` : ''}`,
    );

    logger.log(`[Ticket] 工单#${ticketId} 状态 ${currentStatus} → ${newStatus} 操作者=${operatorType}`);

    return { message: '状态已更新', ticketId, from: currentStatus, to: newStatus };
  }

  /**
   * 商家正式回复
   */
  async staffReply(ticketId: number, staffId: number, content: string, images?: any) {
    const ticket = await this.ticketRepo.findOneBy({ id: ticketId });
    if (!ticket) throw new NotFoundException('工单不存在');

    // 回复后设为"等待用户确认"
    await this.changeStatus(ticketId, TicketStatus.WAITING_USER, 'staff', staffId);

    const reply = this.replyRepo.create({
      ticketId,
      replyerType: 'staff',
      replyerId: staffId,
      content,
      images: images || null,
    });

    return this.replyRepo.save(reply);
  }

  /**
   * 关闭工单
   */
  async closeTicket(ticketId: number, staffId: number, reason?: string) {
    return this.changeStatus(ticketId, TicketStatus.CLOSED, 'staff', staffId, reason);
  }

  /**
   * SLA 超时检查与自动升级
   * 定时任务调用（建议每10分钟执行一次）
   */
  async checkSLABreachments(): Promise<{ breached: number; escalated: number }> {
    const now = new Date();
    let breached = 0;
    let escalated = 0;

    // 查找所有未关闭的活跃工单
    const activeTickets = await this.ticketRepo.find({
      where: [
        { status: In([TicketStatus.PENDING, TicketStatus.PROCESSING]) },
      ],
    });

    for (const ticket of activeTickets) {
      const sla = SLA_CONFIG[ticket.ticketType] || SLA_CONFIG.other;

      // 检查响应超时（待处理且超过响应SLA）
      if (ticket.status === TicketStatus.PENDING && !ticket.firstResponseAt) {
        const deadline = ticket.responseDeadlineAt;
        if (deadline && now > deadline) {
          breached++;
          // 尝试升级
          if (await this.tryEscalate(ticket)) escalated++;
        }
      }

      // 检查解决超时
      else if (ticket.status === TicketStatus.PROCESSING) {
        const elapsedHours = (now.getTime() - (ticket.createdAt?.getTime() || now.getTime())) / (1000 * 60 * 60);
        const maxResolveHours = sla.resolve * 3; // L4 阈值

        if (elapsedHours > maxResolveHours) {
          breached++;
          if (await this.tryEscalate(ticket)) escalated++;
        }
      }
    }

    return { breached, escalated };
  }

  // ==================== 统计 ====================

  /** 工单数据统计 */
  async getStats(startDate?: string, endDate?: string) {
    const baseQb = this.ticketRepo.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (startDate) baseQb.andWhere('t.created_at >= :start', { start: new Date(startDate) });
    if (endDate) baseQb.andWhere('t.created_at <= :end', { end: new Date(endDate + 'T23:59:59') });

    const [
      total,
      pending,
      processing,
      resolved,
      rejected,
      closed,
    ] = await Promise.all([
      baseQb.getCount(),
      baseQb.clone().andWhere('t.status = :s', { s: TicketStatus.PENDING }).getCount(),
      baseQb.clone().andWhere('t.status = :s', { s: TicketStatus.PROCESSING }).getCount(),
      baseQb.clone().andWhere('t.status = :s', { s: TicketStatus.RESOLVED }).getCount(),
      baseQb.clone().andWhere('t.status = :s', { s: TicketStatus.REJECTED }).getCount(),
      baseQb.clone().andWhere('t.status = :s', { s: TicketStatus.CLOSED }).getCount(),
    ]);

    // 各类型分布
    const byType = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.ticket_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('t.deleted_at IS NULL')
      .groupBy('t.ticket_type')
      .getRawMany();

    return {
      overview: { total, pending, processing, resolved, rejected, closed, resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0 },
      byType,
    };
  }

  // ==================== 内部工具方法 ====================

  /** 根据类型推断优先级 */
  private resolvePriority(type: string): number {
    const map: Record<string, number> = { accident: 4, payment: 3, refund: 3, order_issue: 3, account: 2, suggestion: 1, other: 1 };
    return map[type] || 2;
  }

  /** 生成工单编号 */
  private generateTicketNo(): string {
    const datePart = new Date().toISOString().replace(/[-:TZ.]/g, '').substring(0, 14);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TK${datePart}${randomPart}`;
  }

  /** 格式化工单输出（不含敏感字段） */
  private formatTicket(t: Ticket): any {
    const statusMap: Record<number, string> = {
      [0]: '待受理', [1]: '处理中', [2]: '等待用户回复', [3]: '已解决', [-1]: '已拒绝', [-2]: '已关闭', [4]: '重新打开',
    };
    const priorityMap: Record<number, string> = { 1: '低', 2: '中', 3: '高', 4: '紧急' };

    return {
      id: t.id,
      ticketNo: t.ticketNo,
      userId: t.userId,
      ticketType: t.ticketType,
      title: t.title,
      priority: t.priority,
      priorityLabel: priorityMap[t.priority] || '未知',
      status: t.status,
      statusLabel: statusMap[t.status] || '未知',
      orderId: t.orderId,
      assigneeId: t.assigneeId,
      satisfactionScore: t.satisfactionScore,
      firstResponseAt: t.firstResponseAt?.toISOString(),
      responseDeadlineAt: t.responseDeadlineAt?.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  /** 添加系统自动回复 */
  private async addSystemReply(ticketId: number, content: string) {
    const reply = this.replyRepo.create({
      ticketId,
      replyerType: 'system',
      replyerId: 0,
      content,
    });
    return this.replyRepo.save(reply);
  }

  /** 尝试升级工单（返回是否成功升级）*/
  private async tryEscalate(ticket: Ticket): Promise<boolean> {
    const sla = SLA_CONFIG[ticket.ticketType] || SLA_CONFIG.other;
    const now = new Date();
    let elapsedHours = 0;

    if (ticket.status === TicketStatus.PENDING) {
      elapsedHours = ticket.responseDeadlineAt
        ? (now.getTime() - ticket.responseDeadlineAt.getTime()) / (1000 * 60 * 60)
        : (now.getTime() - (ticket.createdAt?.getTime() || now.getTime())) / (1000 * 60 * 60);
    } else {
      elapsedHours = (now.getTime() - (ticket.createdAt?.getTime() || now.getTime())) / (1000 * 60 * 60);
    }

    // 判断当前应该处于哪个升级级别
    let targetLevel = 0;
    for (let i = ESCALATION_MULTIPLIERS.length - 1; i >= 0; i--) {
      const e = ESCALATION_MULTIPLIERS[i];
      if (elapsedHours > sla.response * e.responseMult || elapsedHours > sla.resolve * e.resolveMult) {
        targetLevel = i + 1;
        break;
      }
    }

    if (targetLevel <= 0) return false; // 无需升级

    const levelLabel = ESCALATION_MULTIPLIERS[targetLevel]?.label || 'Unknown';

    // 提升优先级
    const newPriority = Math.min(ticket.priority + 1, 4);
    await this.ticketRepo.update(ticket.id, { priority: newPriority });

    await this.addSystemReply(
      ticket.id,
      `[SLA预警-${levelLabel}] 工单已超时(${Math.round(elapsedHours * 10) / 10}h)，优先级提升至${newPriority}`,
    );

    logger.warn(`[Ticket-SLA] 工单#${ticket.id} 触发${levelLabel}升级`);

    return true;
  }
}
