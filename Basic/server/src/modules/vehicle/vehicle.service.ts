import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Store } from './entities/store.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
  ) {}

  /**
   * 获取附近可用车辆（LBS 查询）
   */
  async getNearbyVehicles(query: {
    page?: number;
    size?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    // TODO: 实现基于经纬度的附近车辆查询
    return { message: '待实现：附近车辆列表', query };
  }

  /**
   * 车辆详情
   */
  async getVehicleDetail(vehicleId: number) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
      relations: ['store', 'model', 'images'],
    });
    // TODO: 脱敏处理 + 格式化返回
    return vehicle || null;
  }

  /**
   * 车型列表（仅上架的）
   */
  async getModelList() {
    return this.modelRepo.find({ where: { isActive: 1 }, order: { sortOrder: 'ASC' } });
  }

  /**
   * 门店列表
   */
  async getStores(query: { page?: number; size?: number; lat?: number; lng?: number }) {
    // TODO: 支持坐标范围筛选
    return this.storeRepo.find({
      where: { isActive: 1 },
      take: query.size || 20,
      skip: ((query.page || 1) - 1) * (query.size || 20),
      order: { sortOrder: 'ASC' },
    });
  }
}
