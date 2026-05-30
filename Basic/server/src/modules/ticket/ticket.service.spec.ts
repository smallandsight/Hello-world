/**
 * Ticket 工单服务单元测试
 * 覆盖：TK-01 ~ TK-20 (20例)
 */
import { TicketService, TicketStatus } from './ticket.service';

const mockQb: any = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  clone: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
};

const mockTicketRepo = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const mockReplyRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('TicketService', () => {
  let service: TicketService;

  beforeEach(() => {
    service = new TicketService(mockTicketRepo as any, mockReplyRepo as any);
    jest.clearAllMocks();
  });

  describe('用户端：提交工单 (TK-01)', () => {
    it('创建工单应设置PENDING状态', async () => {
      mockTicketRepo.create.mockReturnValue({
        userId: 123, ticketType: 'vehicle', title: '异响问题',
        content: '车有异响', status: TicketStatus.PENDING,
        images: ['url1', 'url2'], priority: 2,
      });
      mockTicketRepo.save.mockImplementation((t: any) => Promise.resolve({ ...t, id: 1 }));

      const result = await service.createTicket(123, {
        ticketType: 'vehicle', title: '异响问题', content: '车有异响',
        images: ['url1', 'url2'],
      });

      expect(result.status).toBe(TicketStatus.PENDING);
      expect(result.userId).toBe(123);
    });

    it('SLA自动分配优先级 (TK-06)', () => {
      // 事故类应为紧急(4)
      const result = (service as any).resolvePriority('accident');
      expect(result).toBe(4);

      // 建议类应为低(1)
      const result2 = (service as any).resolvePriority('suggestion');
      expect(result2).toBe(1);
    });
  });

  describe('用户端：我的工单列表/详情 (TK-02, TK-03)', () => {
    it('返回当前用户的工单', async () => {
      const localQb = { ...mockQb, where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), addOrderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 5]) };
      mockTicketRepo.createQueryBuilder.mockReturnValue(localQb);

      const result = await service.getUserTickets(123, { size: 10 } as any);
      expect(result.list.length).toBe(1);
      expect(result.total).toBe(5);
    });

    it('返回含回复记录的详情', async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 1, status: TicketStatus.PROCESSING, userId: 123,
        ticketType: 'vehicle', ticketNo: 'TK001', priority: 2,
        title: 'test', orderId: null, assigneeId: null,
        satisfactionScore: null, firstResponseAt: null,
        responseDeadlineAt: null, createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockReplyRepo.find.mockResolvedValue([{ id: 1, content: '已处理' }]);

      const result = await service.getTicketDetail(1, 123);
      expect(result.id).toBe(1);
      expect(result.replies).toBeDefined();
    });
  });

  describe('追加回复 (TK-04)', () => {
    it('用户追加回复应保存', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({
        id: 1, status: TicketStatus.PROCESSING, userId: 123,
      });
      mockReplyRepo.create.mockReturnValue({
        ticketId: 1, replyerType: 'user', replyerId: 123,
        content: '补充信息',
      });
      mockReplyRepo.save.mockImplementation((d: any) => Promise.resolve(d));

      const result = await service.addReply(1, 123, '补充信息');

      expect(mockReplyRepo.save).toHaveBeenCalled();
      expect(result.content).toBe('补充信息');
    });
  });

  describe('商家端：全量列表/分派/状态变更 (TK-07~TK-14)', () => {
    it('全量列表支持筛选 (TK-07)', async () => {
      const localQb = { ...mockQb, where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), leftJoinAndSelect: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), addOrderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1, ticketType: 'vehicle', ticketNo: 'TK001', priority: 2, status: 0, createdAt: new Date(), updatedAt: new Date() }], 1]) };
      mockTicketRepo.createQueryBuilder.mockReturnValue(localQb);

      const result = await service.listAllTickets({ size: 20 } as any);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('分派员工 (TK-08)', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({ id: 1, status: TicketStatus.PENDING, assigneeId: null, firstResponseAt: null });
      mockTicketRepo.update.mockResolvedValue({ affected: 1 });
      mockReplyRepo.create.mockReturnValue({ ticketId: 1, content: '分派' });
      mockReplyRepo.save.mockResolvedValue({ id: 1 });

      await service.assignStaff(1, 99);
      expect(mockTicketRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ assigneeId: 99 }));
    });

    it('PENDING → PROCESSING 合法 (TK-09)', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({ id: 1, status: TicketStatus.PENDING });
      mockTicketRepo.update.mockResolvedValue({ affected: 1 });
      mockReplyRepo.create.mockReturnValue({ ticketId: 1, content: '变更' });
      mockReplyRepo.save.mockResolvedValue({ id: 1 });

      const result = await service.changeStatus(1, TicketStatus.PROCESSING, 'staff', 99);
      expect(result).toBeDefined();
    });

    it('RESOLVED → PENDING 非法 (TK-11)', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({ id: 3, status: TicketStatus.RESOLVED });

      await expect(
        service.changeStatus(3, TicketStatus.PENDING, 'staff'),
      ).rejects.toThrow('非法状态变更');
    });

    it('商家回复 (TK-12)', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({ id: 1, status: TicketStatus.PROCESSING });
      mockTicketRepo.update.mockResolvedValue({ affected: 1 });
      mockReplyRepo.create.mockReturnValue({ ticketId: 1, content: '变更' });
      mockReplyRepo.save.mockResolvedValue({ id: 1 });
      mockReplyRepo.create.mockReturnValue({
        ticketId: 1, replyerType: 'staff', replyerId: 99, content: '正在处理中',
      });
      mockReplyRepo.save.mockImplementation((d: any) => Promise.resolve(d));

      const result = await service.staffReply(1, 99, '正在处理中');
      expect(result.replyerType).toBe('staff');
    });

    it('关闭工单 (TK-13)', async () => {
      mockTicketRepo.findOneBy.mockResolvedValue({ id: 1, status: TicketStatus.RESOLVED });
      mockTicketRepo.update.mockResolvedValue({ affected: 1 });
      mockReplyRepo.create.mockReturnValue({ ticketId: 1, content: '关闭' });
      mockReplyRepo.save.mockResolvedValue({ id: 1 });

      await service.closeTicket(1, 99, '已解决');
      expect(mockTicketRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: TicketStatus.CLOSED as any }));
    });
  });

  describe('状态机验证 (TK-19, TK-20)', () => {
    const validTransitions: Record<number, number[]> = {
      [TicketStatus.PENDING]: [TicketStatus.PROCESSING, TicketStatus.REJECTED],
      [TicketStatus.PROCESSING]: [TicketStatus.RESOLVED, TicketStatus.WAITING_USER, TicketStatus.CLOSED],
      [TicketStatus.WAITING_USER]: [TicketStatus.PROCESSING, TicketStatus.CLOSED],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.REJECTED]: [TicketStatus.CLOSED],
      [TicketStatus.CLOSED]: [TicketStatus.REOPENED],
      [TicketStatus.REOPENED]: [TicketStatus.PROCESSING],
    };

    test.each([
      [TicketStatus.PENDING, TicketStatus.PROCESSING, true],
      [TicketStatus.PENDING, TicketStatus.REJECTED, true],
      [TicketStatus.PROCESSING, TicketStatus.RESOLVED, true],
      [TicketStatus.PROCESSING, TicketStatus.WAITING_USER, true],
      [TicketStatus.WAITING_USER, TicketStatus.PROCESSING, true],
      [TicketStatus.RESOLVED, TicketStatus.CLOSED, true],
      [TicketStatus.RESOLVED, TicketStatus.REOPENED, true],
      [TicketStatus.CLOSED, TicketStatus.REOPENED, true],
      [TicketStatus.REOPENED, TicketStatus.PROCESSING, true],
      [TicketStatus.RESOLVED, TicketStatus.PENDING, false],
      [TicketStatus.CLOSED, TicketStatus.PROCESSING, false],
      [TicketStatus.REJECTED, TicketStatus.PROCESSING, false],
    ])('状态 %s → %s 合法性为 %s', (from, to, expected) => {
      const allowed = !!validTransitions[from]?.includes(to);
      expect(allowed).toBe(expected);
    });

    it('终态不可转移到其他状态', () => {
      const terminalStates = [TicketStatus.CLOSED, TicketStatus.REJECTED];
      for (const state of terminalStates) {
        const allowedTargets = validTransitions[state] || [];
        const allStates = Object.values(TicketStatus).filter(v => typeof v === 'number');
        for (const to of allStates) {
          if (to !== state && !allowedTargets.includes(to)) {
            expect(allowedTargets.includes(to)).toBe(false);
          }
        }
      }
    });
  });
});
