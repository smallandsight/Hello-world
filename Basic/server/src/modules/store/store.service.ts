import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Like, SelectQueryBuilder } from 'typeorm';
import { Store } from './entities/store.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { CreateStoreDto, UpdateStoreDto, QueryStoreDto } from './dto/store.dto';

/** 地球半径（米） */
const EARTH_RADIUS_METERS = 6371000;

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  // ==================== CRUD ====================

  /**
   * 创建门店
   */
  async createStore(dto: CreateStoreDto): Promise<Store> {
    // 校验编码唯一
    const existing = await this.storeRepo.findOne({
      where: { storeCode: dto.storeCode },
      withDeleted: true, // 包含软删除的
    });
    if (existing) {
      throw new BadRequestException(`门店编码 "${dto.storeCode}" 已存在`);
    }

    // 计算 GeoHash
    const geohash = this.encodeGeoHash(dto.latitude, dto.longitude);

    const store = this.storeRepo.create({
      ...dto,
      isActive: 1,
      geohash,
    });

    return this.storeRepo.save(store);
  }

  /**
   * 门店列表（分页 + 筛选 + LBS）
   */
  async listStores(query: QueryStoreDto) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    let qb: SelectQueryBuilder<Store> = this.storeRepo
      .createQueryBuilder('store')
      .where('store.deleted_at IS NULL');

    // 关键词搜索
    if (query.keyword) {
      qb.andWhere(
        '(store.store_name LIKE :kw OR store.store_code LIKE :kw OR store.address LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    // 城市筛选
    if (query.city) {
      qb.andWhere('store.city = :city', { city: query.city });
    }

    // 启用状态筛选
    if (query.isActive !== undefined && query.isActive !== null) {
      qb.andWhere('store.is_active = :isActive', { isActive: query.isActive });
    }

    // LBS 查询：按距离排序，限制半径
    if (query.lat !== undefined && query.lng !== undefined) {
      const radiusMeters = query.radius || 10000;

      // 使用 Haversine 公式近似计算距离（MySQL 兼容方式）
      // 如果 MySQL 版本支持 ST_Distance_Sphere 可改用空间函数
      qb.addSelect(
        `(${EARTH_RADIUS_METERS} * ACOS(
          COS(RADIANS(${query.lat})) *
          COS(RADIANS(store.latitude)) *
          COS(RADIANS(store.longitude) - RADIANS(${query.lng})) +
          SIN(RADIANS(${query.lat})) * SIN(RADIANS(store.latitude))
        ))`,
        'distance_meters',
      );

      // HAVING 子句过滤超出半径的结果
      qb.having(`distance_meters <= ${radiusMeters}`);
      qb.orderBy('distance_meters', 'ASC');
    } else {
      qb.orderBy('store.sort_order', 'ASC').addOrderBy('store.createdAt', 'DESC');
    }

    const [list, total] = await qb.skip(skip).take(size).getManyAndCount();

    return {
      list,
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 门店详情
   */
  async getStoreDetail(id: number) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('门店不存在');

    // 统计该门店车辆数
    const [totalVehicles, availableVehicles] = await Promise.all([
      this.vehicleRepo.count({ where: { storeId: id, isActive: 1 } }),
      this.vehicleRepo.count({ where: { storeId: id, status: 1, isActive: 1 } }),
    ]);

    return {
      ...store,
      vehicleStats: { total: totalVehicles, available: availableVehicles },
    };
  }

  /**
   * 更新门店信息
   */
  async updateStore(id: number, dto: UpdateStoreDto) {
    const store = await this.storeRepo.findOneBy({ id });
    if (!store) throw new NotFoundException('门店不存在');

    // 如果更新了坐标，重新计算 GeoHash
    let updateData: any = { ...dto };
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      updateData.geohash = this.encodeGeoHash(
        dto.latitude ?? store.latitude,
        dto.longitude ?? store.longitude,
      );
    }

    Object.assign(store, updateData);
    return this.storeRepo.save(store);
  }

  /**
   * 软删除/停用门店
   */
  async deleteStore(id: number) {
    const store = await this.storeRepo.findOneBy({ id });
    if (!store) throw new NotFoundException('门店不存在');

    // 检查是否有关联的进行中订单或已租用车辆
    const activeVehicles = await this.vehicleRepo.count({
      where: [{ storeId: id, status: 2 }],
    });

    if (activeVehicles > 0) {
      throw new BadRequestException(
        `该门店下仍有 ${activeVehicles} 辆使用中的车辆，无法停用。请先处理在途订单`,
      );
    }

    await this.storeRepo.softDelete(id);
    return { message: '门店已停用', storeId: id };
  }

  // ==================== 库存查询 ====================

  /**
   * 门店库存查看（各门店可用车辆列表）
   */
  async getStoreInventory(storeId: number, query?: { page?: number; size?: number; status?: number }) {
    // 先确认门店存在
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException('门店不存在');

    const page = query?.page || 1;
    const size = Math.min(query?.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.vehicleRepo
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .where('vehicle.store_id = :storeId', { storeId })
      .andWhere('vehicle.deleted_at IS NULL')
      .andWhere('vehicle.is_active = 1');

    if (query?.status !== undefined && query.status !== null) {
      qb.andWhere('vehicle.status = :status', { status: query.status });
    }

    const [list, total] = await qb
      .orderBy('vehicle.status', 'ASC')
      .addOrderBy('vehicle.updatedAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    return {
      storeId,
      storeName: store.storeName,
      list,
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 附近门店（LBS 排序）— 面向用户的简化接口
   */
  async getNearbyStores(lat: number, lng: number, radius?: number, limit: number = 10) {
    const query: QueryStoreDto = {
      lat,
      lng,
      radius: radius || 10000,
      isActive: 1,
      size: Math.min(limit, 50),
      page: 1,
    };

    const result = await this.listStores(query);
    return result.list.map((s: any) => ({
      id: s.id,
      storeName: s.storeName,
      address: `${s.province}${s.city}${s.district || ''}${s.address}`,
      latitude: s.latitude,
      longitude: s.longitude,
      phone: s.phone,
      openTime: s.openTime,
      closeTime: s.closeTime,
      distanceMeters: Math.round(s.distance_meters || 0),
    }));
  }

  /**
   * 更新门店坐标
   */
  async updateLocation(id: number, lat: number, lng: number) {
    const store = await this.storeRepo.findOneBy({ id });
    if (!store) throw new NotFoundException('门店不存在');

    const geohash = this.encodeGeoHash(lat, lng);

    await this.storeRepo.update(id, {
      latitude: lat,
      longitude: lng,
      geohash,
    });

    return {
      message: '门店位置已更新',
      storeId: id,
      location: { lat, lng, geohash },
    };
  }

  // ==================== 内部工具方法 ====================

  /**
   * GeoHash 编码（精度 6 位 ≈ ±610m，适合门店级别定位）
   * 简化实现：生产环境建议使用 node-geohash 库
   */
  private encodeGeoHash(lat: number, lng: number): string {
    const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    const BITS = [16, 8, 4, 2, 1];
    let hash = '';
    let even = true; // 偶数位经度，奇数位纬度
    let latRange = [-90, 90];
    let lngRange = [-180, 180];

    for (let i = 0; i < 6; i++) {
      let value = 0;
      for (let j = 0; j < 5; j++) {
        if (even) {
          const mid = (lngRange[0] + lngRange[1]) / 2;
          if (lng >= mid) {
            value |= BITS[j];
            lngRange[0] = mid;
          } else {
            lngRange[1] = mid;
          }
        } else {
          const mid = (latRange[0] + latRange[1]) / 2;
          if (lat >= mid) {
            value |= BITS[j];
            latRange[0] = mid;
          } else {
            latRange[1] = mid;
          }
        }
        even = !even;
      }
      hash += GEOHASH_BASE32[value];
    }

    return hash;
  }
}
