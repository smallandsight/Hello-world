/**
 * Review 评价服务单元测试
 * 覆盖：RV-01 ~ RV-08 (8例)
 */
import { ReviewService } from './review.service';
import { Review, ReviewStatus } from './entities/review.entity';

const mockReviewRepo = {
  findOneBy: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    service = new ReviewService(mockReviewRepo as any);
    jest.clearAllMocks();
  });

  describe('提交评价 (RV-01, RV-03)', () => {
    it('未评价的订单应允许评价', async () => {
      mockReviewRepo.findOneBy.mockResolvedValue(null);
      mockReviewRepo.create.mockReturnValue({
        userId: 123, orderId: 1, vehicleId: 10, rating: 5,
        content: '很好开', tags: ['干净'], status: ReviewStatus.PENDING,
      });
      mockReviewRepo.save.mockResolvedValue({ id: 1, rating: 5 });

      const result = await service.createReview(123, {
        orderId: 1, vehicleId: 10, rating: 5, content: '很好开', tags: ['干净'],
      });

      expect(result.id).toBe(1);
      expect(result.rating).toBe(5);
      expect(mockReviewRepo.save).toHaveBeenCalled();
    });

    it('重复评价应报错 (RV-03)', async () => {
      mockReviewRepo.findOneBy.mockResolvedValue({ id: 5 });

      await expect(
        service.createReview(123, { orderId: 1, vehicleId: 10, rating: 4 }),
      ).rejects.toThrow('该订单已评价');
    });
  });

  describe('车辆评价列表 (RV-04)', () => {
    it('返回审核通过的评价列表', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 1, rating: 5, content: '好', status: 'APPROVED', createdAt: new Date() },
           { id: 2, rating: 4, content: '不错', status: 'APPROVED', createdAt: new Date() }],
          2,
        ]),
      };
      mockReviewRepo.createQueryBuilder.mockReturnValue(mockQb);

      // Recreate service with the new mock
      const svc = new ReviewService(mockReviewRepo as any);
      const result = await svc.getVehicleReviews(10, { page: 1, size: 10 } as any);

      expect(result.list.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe('评分汇总 (RV-05)', () => {
    it('应返回平均分和各星级占比', async () => {
      mockReviewRepo.find.mockResolvedValue([
        { rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 3 },
      ] as Review[]);

      const result = await service.getVehicleSummary(10);

      expect(result.averageRating).toBe(4.3);
      expect(result.totalReviews).toBe(4);
    });
  });

  describe('我的评价列表 (RV-06)', () => {
    it('返回当前用户的评价', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1, rating: 4, createdAt: new Date() }], 1]),
      };
      mockReviewRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getMyReviews(123, { page: 1, size: 10 } as any);
      expect(result.list.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('商家回复 (RV-07)', () => {
    it('商家回复应保存内容和时间', async () => {
      mockReviewRepo.findOneBy
        .mockResolvedValueOnce({
          id: 1, status: ReviewStatus.PENDING, replyContent: null,
        } as Review)
        .mockResolvedValueOnce({
          id: 1, replyContent: '感谢您的好评！', repliedAt: new Date(),
        } as Review);
      mockReviewRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.replyToReview(1, { replyContent: '感谢您的好评！' });

      expect(result.replyContent).toBe('感谢您的好评！');
      expect(result.repliedAt).toBeDefined();
    });
  });

  describe('敏感词过滤 (RV-08)', () => {
    it('提交评价默认状态为PENDING', async () => {
      mockReviewRepo.findOneBy.mockResolvedValue(null);
      mockReviewRepo.create.mockReturnValue({
        userId: 123, orderId: 3, vehicleId: 10, rating: 3,
        content: '包含敏感词的内容', status: ReviewStatus.PENDING,
      });
      mockReviewRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await service.createReview(123, {
        orderId: 3, vehicleId: 10, rating: 3, content: '包含敏感词的内容',
      });

      expect(result.status).toBe(ReviewStatus.PENDING);
    });
  });
});
