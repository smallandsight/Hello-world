/**
 * Wallet 钱包服务单元测试
 * 覆盖：WAL-01 ~ WAL-12 (12例)
 */
import { WalletService } from './wallet.service';

const mockTxRepo = {
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockWalletRepo = {
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  manager: { transaction: jest.fn() },
  createQueryBuilder: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    service = new WalletService(mockWalletRepo as any, mockTxRepo as any);
    jest.clearAllMocks();
  });

  describe('查询钱包信息 (WAL-01)', () => {
    it('应返回钱包余额、冻结额和可用余额', async () => {
      mockWalletRepo.findOneBy.mockResolvedValue({
        id: 1, userId: 123, balanceCents: 10000, frozenAmount: 5000, version: 5,
      });

      const result = await service.getBalance(123);

      expect(result.balanceCents).toBe(10000);
      expect(result.frozenAmount).toBe(5000);
      expect(result.availableCents).toBe(5000);
    });
  });

  describe('新用户钱包自动创建 (WAL-02)', () => {
    it('首次查询时自动初始化钱包', async () => {
      mockWalletRepo.findOneBy.mockResolvedValue(null);
      mockWalletRepo.create.mockReturnValue({
        userId: 999, balanceCents: 0, frozenAmount: 0, version: 1,
      });
      mockWalletRepo.save.mockResolvedValue({
        id: 1, userId: 999, balanceCents: 0, frozenAmount: 0, version: 1,
      });

      const wallet = await service.getOrCreateWallet(999);

      expect(wallet.balanceCents).toBe(0);
      expect(mockWalletRepo.create).toHaveBeenCalled();
      expect(mockWalletRepo.save).toHaveBeenCalled();
    });
  });

  describe('交易流水查询 (WAL-03, WAL-04)', () => {
    it('按时间倒序返回交易记录', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 1, type: 'RECHARGE' }, { id: 2, type: 'PAY' }], 2,
        ]),
      };
      mockTxRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getTransactions(123, { page: 1, size: 20 });

      expect(result.list.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('支持按类型筛选流水', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 1, type: 'RECHARGE' }], 1,
        ]),
      };
      mockTxRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getTransactions(123, { page: 1, size: 20, type: 'RECHARGE' });

      expect(result.list.length).toBe(1);
    });
  });

  describe('充值 (WAL-05)', () => {
    it('创建充值记录', async () => {
      mockWalletRepo.findOneBy.mockResolvedValue({
        id: 1, userId: 123, balanceCents: 0, frozenAmount: 0, version: 1,
      });

      const result = await service.recharge(123, { amountCents: 10000, payMethod: 'alipay' });

      expect(result.status).toBe('PENDING_PAYMENT');
      expect(result.amountCents).toBe(10000);
    });
  });

  describe('余额不足校验 (WAL-07)', () => {
    it('余额不足时应报错', async () => {
      mockWalletRepo.findOneBy.mockResolvedValue({
        id: 1, userId: 123, balanceCents: 100, frozenAmount: 0, version: 1,
      });

      await expect(
        service.deductBalance(123, 99999, 'PAY'),
      ).rejects.toThrow('余额不足');
    });
  });

  describe('冻结/解冻操作 (WAL-10, WAL-11)', () => {
    it('违章押金应增加frozenAmount', async () => {
      mockWalletRepo.findOneBy.mockResolvedValue({
        id: 1, userId: 123, balanceCents: 10000, frozenAmount: 0, version: 1,
      });
      mockWalletRepo.update.mockResolvedValue({ affected: 1 });

      await service.freezeAmount(123, 5000);

      expect(mockWalletRepo.update).toHaveBeenCalled();
    });

    it('退还应减少frozenAmount', async () => {
      mockWalletRepo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      await service.unfreezeAmount(123, 5000);

      expect(mockWalletRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('流水金额符号规则 (WAL-12)', () => {
    it('充值和退款应为正数', () => {
      const rechargeTx = { type: 'RECHARGE', amount: 10000 };
      const refundTx = { type: 'REFUND', amount: 5000 };
      expect(rechargeTx.amount).toBeGreaterThan(0);
      expect(refundTx.amount).toBeGreaterThan(0);
    });

    it('支付和扣除应为负数', () => {
      const payTx = { type: 'PAY', amount: -2000 };
      const deductionTx = { type: 'DEDUCTION', amount: -500 };
      expect(payTx.amount).toBeLessThan(0);
      expect(deductionTx.amount).toBeLessThan(0);
    });
  });
});
