/**
 * Order 订单服务单元测试
 * 覆盖：订单创建/状态转换/取还车核心逻辑
 */
import { OrderService } from './order.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockQb: any = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
};
const mockOrderRepo = {
  findOne: jest.fn(), findOneBy: jest.fn(), create: jest.fn(),
  save: jest.fn(), update: jest.fn(), count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};
const mockLogRepo = { create: jest.fn(), save: jest.fn() };
const mockVehicleRepo = { findOne: jest.fn(), update: jest.fn() };
const mockModelRepo = { findOne: jest.fn() };
const mockStoreRepo = { findOne: jest.fn(), findOneBy: jest.fn() };
const mockUserCouponRepo = { findOne: jest.fn(), update: jest.fn() };
const mockRedis = {
  get: jest.fn(), set: jest.fn(), del: jest.fn(),
  incr: jest.fn(), acquireLock: jest.fn(), releaseLock: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService(
      mockOrderRepo as any, mockLogRepo as any,
      mockVehicleRepo as any, mockModelRepo as any,
      mockStoreRepo as any, mockUserCouponRepo as any,
      mockRedis as any,
    );
    jest.clearAllMocks();
  });

  describe('createOrder - 创建订单', () => {
    it('应生成订单号并创建订单', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.acquireLock.mockResolvedValue(true);
      mockRedis.releaseLock.mockResolvedValue(true);

      mockVehicleRepo.findOne.mockResolvedValue({
        id: 10, status: 1, storeId: 1, modelId: 5,
        store: { isActive: 1, address: '朝阳区xxx', province: '北京', city: '北京', district: '朝阳区', latitude: 39.9, longitude: 116.4 },
        model: { id: 5, pricePerHourCents: 2000, dailyCapCents: 20000, basePriceCents: 0 },
      });
      mockModelRepo.findOne.mockResolvedValue({
        id: 5, dailyPriceCents: 20000, depositAmount: 50000,
        violationDeposit: 20000, serviceFeeRate: 0.05, insuranceFeePerDayCents: 3000,
        pricePerHourCents: 2000, dailyCapCents: 20000, basePriceCents: 0,
      });
      mockStoreRepo.findOne.mockResolvedValue({
        id: 1, isActive: 1, address: '朝阳区xxx',
        province: '北京', city: '北京', district: '朝阳区',
        latitude: 39.9, longitude: 116.4,
      });
      mockStoreRepo.findOneBy.mockResolvedValue({
        id: 2, isActive: 1, address: '海淀区xxx',
        province: '北京', city: '北京', district: '海淀区',
        latitude: 39.95, longitude: 116.3,
      });
      mockOrderRepo.count.mockResolvedValue(0);
      mockOrderRepo.create.mockReturnValue({ id: 1, orderNo: 'GY202605240000000001' });
      mockOrderRepo.save.mockResolvedValue({
        id: 1, orderNo: 'GY202605240000000001', status: 10, totalAmountCents: 60000,
      });

      const result = await service.createOrder(123, {
        vehicleId: 10, modelId: 5,
        pickupStoreId: 1, returnStoreId: 2,
        pickupTime: '2026-06-01T10:00:00Z', returnTime: '2026-06-03T10:00:00Z',
        rentalDays: 2,
      } as any);

      expect(result.id).toBe(1);
      expect(result.orderNo).toBeDefined();
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('非待租状态车辆应拒绝下单', async () => {
      mockRedis.acquireLock.mockResolvedValue(true);
      mockRedis.releaseLock.mockResolvedValue(true);
      mockVehicleRepo.findOne.mockResolvedValue({ id: 10, status: 2 });

      await expect(
        service.createOrder(123, { vehicleId: 10, pickupTime: '2026-06-01T10:00:00Z', returnTime: '2026-06-03T10:00:00Z', rentalDays: 2 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder - 取消订单', () => {
    it('待支付订单可以取消', async () => {
      mockOrderRepo.findOneBy.mockResolvedValue({
        id: 1, status: 10, userId: 123,
      });
      mockOrderRepo.update.mockResolvedValue({ affected: 1 });
      mockVehicleRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.cancelOrder(1, 123);
      expect(result.message).toContain('已取消');
    });
  });

  describe('状态转换校验', () => {
    it('非法状态转换应报错', async () => {
      mockOrderRepo.findOneBy.mockResolvedValue({
        id: 1, status: 60, userId: 123,
      });

      await expect(
        service.cancelOrder(1, 123),
      ).rejects.toThrow();
    });
  });
});
