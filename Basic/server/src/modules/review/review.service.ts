import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/query-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  // ==================== 用户评价 ====================

  /**
   * 提交评价（每订单限评1次）
   */
  async createReview(userId: number, dto: CreateReviewDto): Promise<Review> {
    // 检查是否已评价
    const existing = await this.reviewRepo.findOneBy({ orderId: dto.orderId });
    if (existing) {
      throw new ConflictException('该订单已评价，不可重复提交');
    }

    const review = this.reviewRepo.create({
      userId,
      orderId: dto.orderId,
      vehicleId: dto.vehicleId,
      rating: dto.rating,
      content: dto.content || null,
      images: dto.images?.length ? dto.images : null,
      tags: dto.tags?.length ? dto.tags : null,
      status: ReviewStatus.PENDING, // 默认待审核
    });

    return await this.reviewRepo.save(review);
  }

  // ==================== 评价查询（公开） ====================

  /**
   * 获取某车辆的评价列表（分页）
   * 只展示 APPROVED 状态的评价
   */
  async getVehicleReviews(
    vehicleId: number,
    query: ReviewQueryDto,
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const qb = this.buildApprovedQuery()
      .where('r.vehicleId = :vehicleId', { vehicleId });

    this.applyRatingFilter(qb, query);
    if (query.hasImages) {
      qb.andWhere('r.images IS NOT NULL');
    }

    const [list, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.size)
      .getManyAndCount();

    return {
      list: list.map(this.formatReview),
      total,
      page: query.page,
      size: query.size,
      pages: Math.ceil(total / query.size),
    };
  }

  /**
   * 获取车辆评分汇总：均分 + 分布
   */
  async getVehicleSummary(
    vehicleId: number,
  ): Promise<{
    vehicleId: number;
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    // 获取所有已通过的评价
    const reviews = await this.reviewRepo.find({
      where: { vehicleId, status: ReviewStatus.APPROVED },
      select: ['rating'],
    });

    const total = reviews.length;

    if (total === 0) {
      return {
        vehicleId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // 计算均分和分布
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    return {
      vehicleId,
      totalReviews: total,
      averageRating: Math.round((sum / total) * 10) / 10,
      ratingDistribution: distribution,
    };
  }

  /**
   * 我的评价列表
   */
  async getMyReviews(
    userId: number,
    query: ReviewQueryDto,
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const qb = this.reviewRepo.createQueryBuilder('r')
      .where('r.userId = :userId', { userId });

    this.applyRatingFilter(qb, query);

    const [list, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip(query.offset)
      .take(query.size)
      .getManyAndCount();

    return {
      list: list.map(this.formatReview),
      total,
      page: query.page,
      size: query.size,
      pages: Math.ceil(total / query.size),
    };
  }

  // ==================== 商家回复 ====================

  /**
   * 商家回复评价
   */
  async replyToReview(reviewId: number, dto: ReplyReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException('评价不存在');
    if (review.status !== ReviewStatus.APPROVED && review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('该状态下的评价无法回复');
    }
    if (review.replyContent) {
      throw new BadRequestException('该评价已回复，请勿重复操作');
    }

    await this.reviewRepo.update(reviewId, {
      replyContent: dto.replyContent,
      repliedAt: new Date(),
      status: ReviewStatus.APPROVED, // 回复后自动通过
    });

    return this.reviewRepo.findOneBy({ id: reviewId })!;
  }

  // ==================== 内部工具 ====================

  /** 构建基础已审核通过的查询 */
  private buildApprovedQuery(): SelectQueryBuilder<Review> {
    return this.reviewRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: ReviewStatus.APPROVED });
  }

  /** 应用评分范围筛选 */
  private applyRatingFilter(qb: SelectQueryBuilder<Review>, query: ReviewQueryDto): void {
    if (query.minRating !== undefined) {
      qb.andWhere('r.rating >= :minRating', { minRating: query.minRating });
    }
    if (query.maxRating !== undefined) {
      qb.andWhere('r.rating <= :maxRating', { maxRating: query.maxRating });
    }
  }

  /** 格式化评价输出 */
  private formatReview(r: Review): any {
    return {
      id: r.id,
      userId: r.userId,
      orderId: r.orderId,
      vehicleId: r.vehicleId,
      rating: r.rating,
      content: r.content,
      images: r.images,
      tags: r.tags,
      replyContent: r.replyContent,
      repliedAt: r.repliedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
