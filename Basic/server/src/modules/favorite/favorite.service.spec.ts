/**
 * 收藏模块单元测试
 * 覆盖：FAV-01 ~ FAV-06 (6例)
 */
import { FavoriteService } from './favorite.service';

const mockFavoriteRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  query: jest.fn(),
};

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(() => {
    service = new FavoriteService(mockFavoriteRepo as any);
    jest.clearAllMocks();
  });

  describe('收藏车辆 (FAV-01)', () => {
    it('首次收藏应创建记录', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue(null);
      mockFavoriteRepo.query.mockResolvedValue([{ cnt: 1 }]);
      mockFavoriteRepo.create.mockReturnValue({ userId: 123, vehicleId: 10 });
      mockFavoriteRepo.save.mockResolvedValue({ id: 1, userId: 123, vehicleId: 10 });

      const result = await service.addFavorite(123, 10);

      expect(result.success).toBe(true);
      expect(result.isFavorited).toBe(true);
      expect(mockFavoriteRepo.save).toHaveBeenCalled();
    });

    it('重复收藏应幂等处理 (FAV-02)', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue({ id: 5, userId: 123, vehicleId: 10 });

      const result = await service.addFavorite(123, 10);

      expect(result.success).toBe(true);
      expect(result.message).toBe('已收藏');
    });
  });

  describe('取消收藏 (FAV-03, FAV-04)', () => {
    it('应删除收藏记录', async () => {
      mockFavoriteRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.removeFavorite(123, 10);

      expect(result.success).toBe(true);
      expect(mockFavoriteRepo.delete).toHaveBeenCalledWith({
        userId: 123, vehicleId: 10,
      });
    });

    it('取消不存在的收藏应报错', async () => {
      mockFavoriteRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.removeFavorite(999, 888),
      ).rejects.toThrow('未找到该收藏记录');
    });
  });

  describe('我的收藏列表 (FAV-05)', () => {
    it('返回含车辆信息的收藏列表', async () => {
      mockFavoriteRepo.findAndCount.mockResolvedValue([
        [{ id: 1, vehicleId: 10, createdAt: new Date() }],
        1,
      ]);
      mockFavoriteRepo.query.mockResolvedValue([
        { id: 10, name: '大众朗逸', brand: '大众', model: '朗逸', image_url: 'url', daily_price_cents: 20000, status: 1 },
      ]);

      const result = await service.getFavorites(123, { page: 1, size: 10 } as any);

      expect(result.list.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.list[0].vehicle).toBeDefined();
    });
  });

  describe('检查是否已收藏 (FAV-06)', () => {
    it('已收藏返回true', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.checkFavorited(123, 10);
      expect(result.favorited).toBe(true);
    });

    it('未收藏返回false', async () => {
      mockFavoriteRepo.findOne.mockResolvedValue(null);

      const result = await service.checkFavorited(123, 99);
      expect(result.favorited).toBe(false);
    });
  });
});
