import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { PageQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  // ==================== 收藏/取消收藏 ====================

  /**
   * 收藏车辆（幂等：已收藏则返回成功，不重复创建）
   */
  async addFavorite(userId: number, vehicleId: number): Promise<{
    success: boolean;
    message: string;
    isFavorited: boolean;
  }> {
    const existing = await this.favoriteRepo.findOne({
      where: { userId, vehicleId },
    });

    if (existing) {
      return {
        success: true,
        message: '已收藏',
        isFavorited: true,
      };
    }

    // 校验车辆是否存在（通过原生查询避免循环依赖）
    const vehicleExists = await this.checkVehicleExists(vehicleId);
    if (!vehicleExists) {
      throw new NotFoundException('该车辆不存在或已下架');
    }

    const favorite = this.favoriteRepo.create({ userId, vehicleId });
    await this.favoriteRepo.save(favorite);

    return {
      success: true,
      message: '收藏成功',
      isFavorited: true,
    };
  }

  /**
   * 取消收藏
   */
  async removeFavorite(userId: number, vehicleId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await this.favoriteRepo.delete({
      userId,
      vehicleId,
    });

    if (result.affected === 0) {
      throw new ConflictException('未找到该收藏记录');
    }

    return {
      success: true,
      message: '取消收藏成功',
    };
  }

  // ==================== 查询 ====================

  /**
   * 我的收藏列表（关联车辆信息）
   * 返回分页结果：{ list, total, page, size, pages }
   */
  async getFavorites(
    userId: number,
    query?: PageQueryDto,
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    size: number;
    pages: number;
  }> {
    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 50);

    // 查询收藏记录
    const [favorites, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    if (favorites.length === 0) {
      return { list: [], total: 0, page, size, pages: 0 };
    }

    // 批量查询关联的车辆基本信息
    const vehicleIds = favorites.map((f) => f.vehicleId);
    const vehicles = await this.getVehicleBatchInfo(vehicleIds);

    const list = favorites.map((f) => ({
      id: f.id,
      vehicleId: f.vehicleId,
      favoritedAt: f.createdAt.toISOString(),
      vehicle: vehicles[f.vehicleId] || null,
    }));

    return {
      list,
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 检查是否已收藏某车辆
   */
  async checkFavorited(userId: number, vehicleId: number): Promise<{
    favorited: boolean;
  }> {
    const existing = await this.favoriteRepo.findOne({
      where: { userId, vehicleId },
      select: ['id'],
    });
    return { favorited: !!existing };
  }

  // ==================== 内部工具 ====================

  /** 检查车辆是否存在 */
  private async checkVehicleExists(vehicleId: number): Promise<boolean> {
    try {
      const result = await this.favoriteRepo.query(
        'SELECT COUNT(*) AS cnt FROM vehicles WHERE id = ? AND deleted_at IS NULL',
        [vehicleId],
      );
      return result[0]?.cnt > 0;
    } catch {
      return false;
    }
  }

  /** 批量获取车辆信息 */
  private async getVehicleBatchInfo(vehicleIds: number[]): Promise<Record<number, any>> {
    if (vehicleIds.length === 0) return {};

    try {
      const vehicles = await this.favoriteRepo.query(
        `SELECT id, name, brand, model, image_url, daily_price_cents, status
           FROM vehicles
          WHERE id IN (?) AND deleted_at IS NULL`,
        [vehicleIds],
      );

      const map: Record<number, any> = {};
      for (const v of vehicles) {
        map[v.id] = {
          id: v.id,
          name: v.name,
          brand: v.brand,
          model: v.model,
          imageUrl: v.image_url,
          dailyPriceCents: v.daily_price_cents,
          status: v.status,
        };
      }
      return map;
    } catch {
      return {};
    }
  }
}
