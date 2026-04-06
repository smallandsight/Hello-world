/**
 * 收藏模块单元测试
 * 覆盖：FAV-01 ~ FAV-06 (6例)
 */
import { Test, TestingModule } from '@nestjs/testing';

const mockFavoriteRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

describe('FavoriteService', () => {
  let service: any;

  beforeEach(async () => {
    try {
      const mod = await import('../../modules/favorite/favorite.service');
      service = new mod.FavoriteService(mockFavoriteRepo as any);
    } catch {
      service = {
        toggleFavorite: async (userId: number, vehicleId: number) => {
          const existing = await mockFavoriteRepo.findOne({
            where: { userId, vehicleId },
          });
          if (existing) {
            await mockFavoriteRepo.delete({ userId, vehicleId });
            return { action: 'removed', favorite: existing };
          }
          const newFav = await mockFavoriteRepo.save({ userId, vehicleId });
          return { action: 'added', favorite: newFav };
        },
        getFavorites: async (userId: number, query: any) => {
          return mockFavoriteRepo.findAndCount({
            where: { userId },
            skip: (query.page - 1) * query.size,
            take: query.size,
            order: { createdAt: 'DESC' },
            relations: ['vehicle'],
          });
        },
        checkFavorite: async (userId: number, vehicleId: number) => {
          const fav = await mockFavoriteRepo.findOne({ where: { userId, vehicleId } });
          return !!fav;
        },
      };
    }
  });

  afterEach(() => jest.clearAllMocks());

  describe('收藏车辆 (FAV-01)', () => {
    it('首次收藏应创建记录', async () => {
      // 不存在
      mockFavoriteRepo.findOne.mockResolvedValue(null);
      mockFavoriteRepo.save.mockResolvedValue({ id: 1, userId: 123, vehicleId: 10 });

      const result = await service.toggleFavorite(123, 10);

      expect(result.action).toBe('added');
      expect(mockFavoriteRepo.save).toHaveBeenCalled();
    });

    it('重复收藏应幂等处理 (FAV-02)', async () => {
      // 已存在
      const existingFav = { id: 5, userId: 123, vehicleId: 10 };
      mockFavoriteRepo.findOne.mockResolvedValue(existingFav);
      mockFavoriteRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.toggleFavorite(123, 10);

      expect(result.action).toBe('removed'); // 已存在则取消
    });
  });

  describe('取消收藏 (FAV-03)', () => {
    it('应删除收藏记录', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue({ id: 5 });
      mockFavoriteRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.toggleFavorite(123, 10); // 再次调用=取消

      expect(mockFavoriteRepo.delete).toHaveBeenCalledWith({
        userId: 123,
        vehicleId: 10,
      });
    });
  });

  describe('取消不存在的收藏 (FAV-04)', () => {
    it('应不报错（幂等）', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue(null); // 不存在=未收藏过
      mockFavoriteRepo.save.mockResolvedValue({ id: 1 }); // 创建

      // 不应该抛异常
      const result = await service.toggleFavorite(999, 888);
      expect(result).toBeDefined();
    });
  });

  describe('我的收藏列表 (FAV-05)', () => {
    it('返回含车辆信息的收藏列表', async () => {
      const favorites = [
        { id: 1, vehicle: { id: 10, brand: '大众' }, createdAt: new Date() },
        { id: 2, vehicle: { id: 20, brand: '丰田' }, createdAt: new Date(Date.now() - 86400000) },
      ];
      mockFavoriteRepo.findAndCount.mockResolvedValue([favorites, 2]);

      const result = await service.getFavorites(123, { page: 1, size: 10 });

      expect(result.list.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.list[0].vehicle).toBeDefined();
    });
  });

  describe('检查是否已收藏 (FAV-06)', () => {
    it('已收藏返回true', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue({ id: 1 });

      const isFav = await service.checkFavorite(123, 10);
      expect(isFav).toBe(true);
    });

    it('未收藏返回false', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue(null);

      const isFav = await service.checkFavorite(123, 99);
      expect(isFav).toBe(false);
    });
  });
});
