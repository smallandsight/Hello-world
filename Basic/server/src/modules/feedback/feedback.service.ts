import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Feedback, FeedbackStatus, FeedbackCategory } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { PageQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  // ==================== 用户反馈 ====================

  /**
   * 提交反馈
   */
  async createFeedback(userId: number, dto: CreateFeedbackDto): Promise<Feedback> {
    // 图片数量限制
    if (dto.images && dto.images.length > 5) {
      throw new BadRequestException('最多上传5张图片');
    }

    const feedback = this.feedbackRepo.create({
      userId,
      category: dto.category,
      content: dto.content,
      images: dto.images?.length ? dto.images : null,
      contactPhone: dto.contactPhone || null,
      contactEmail: dto.contactEmail || null,
      status: FeedbackStatus.PENDING,
    });

    return await this.feedbackRepo.save(feedback);
  }

  // ==================== 反馈查询 ====================

  /**
   * 我的反馈列表（分页）
   */
  async getMyFeedbacks(
    userId: number,
    query?: PageQueryDto & { status?: string; category?: string },
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 50);

    const qb = this.feedbackRepo.createQueryBuilder('f')
      .where('f.userId = :userId', { userId });

    if (query?.status) {
      qb.andWhere('f.status = :status', { status: query.status });
    }
    if (query?.category) {
      qb.andWhere('f.category = :category', { category: query.category });
    }

    const [list, total] = await qb
      .orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      list: list.map((f) => this.formatFeedback(f)),
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 获取反馈详情
   */
  async getDetail(id: number): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOneBy({ id });
    if (!feedback) throw new NotFoundException('反馈记录不存在');
    return feedback;
  }

  // ==================== 管理端 ====================

  /**
   * 更新反馈状态/回复
   */
  async updateStatus(
    id: number,
    data: Partial<{ status: FeedbackStatus; staffReply: string }>,
  ): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOneBy({ id });
    if (!feedback) throw new NotFoundException('反馈记录不存在');

    const updateData: any = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.staffReply !== undefined && data.staffReply) {
      updateData.staffReply = data.staffReply;
      updateData.repliedAt = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      Object.assign(feedback, updateData);
      await this.feedbackRepo.save(feedback);
    }

    return feedback;
  }

  // ==================== 内部工具 ====================

  /** 格式化输出 */
  private formatFeedback(f: Feedback): any {
    return {
      id: f.id,
      category: f.category,
      content: f.content,
      images: f.images,
      contactPhone: f.contactPhone ? '****' + f.contactPhone.slice(-4) : null,
      contactEmail: f.contactEmail,
      status: f.status,
      staffReply: f.staffReply || null,
      repliedAt: f.repliedAt?.toISOString() || null,
      createdAt: f.createdAt.toISOString(),
    };
  }
}
