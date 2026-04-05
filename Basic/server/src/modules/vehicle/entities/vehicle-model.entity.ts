/**
 * 车型实体（vehicle_models 表）
 * 定义车辆型号、价格配置、规格参数等
 */
import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Vehicle } from './vehicle.entity';
import { MaintenanceType } from '../../../../shared/types/vehicle.types';

@Entity('vehicle_models')
export class VehicleModel extends BaseEntity {
  /** 车型名称 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'model_name',
    comment: '车型名称',
  })
  modelName: string;

  /** 车型编码 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'model_code',
    comment: '车型编码',
  })
  modelCode: string;

  // ========== 品牌与分类 ==========

  /** 品牌 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'brand',
    comment: '品牌',
  })
  brand: string;

  /** 车辆类型：electric/motorcycle/bicycle */
  @Column({
    type: 'enum',
    enum: ['electric', 'motorcycle', 'bicycle'],
    name: 'vehicle_type',
    default: 'electric',
    comment: '车辆类型',
  })
  vehicleType: 'electric' | 'motorcycle' | 'bicycle';

  // ========== 价格配置（分为单位） ==========

  /** 基础单价：元/小时 → 分/小时 */
  @Column({
    type: 'bigint',
    name: 'price_per_hour_cents',
    comment: '基础单价(分/小时)',
  })
  pricePerHourCents: number;

  /** 封顶价（24h）：分 */
  @Column({
    type: 'bigint',
    name: 'daily_cap_cents',
    nullable: true,
    comment: '日封顶价格(分)',
  })
  dailyCapCents: number | null;

  /** 起步价（分） */
  @Column({
    type: 'bigint',
    name: 'base_price_cents',
    default: 0,
    comment: '起步价(分)',
  })
  basePriceCents: number;

  // ========== 规格参数 JSON ==========

  /** 配置参数 JSON（电池容量、续航里程等） */
  @Column({
    type: 'json',
    name: 'features',
    nullable: true,
    comment: '规格参数JSON {battery, range, maxSpeed, weight}',
  })
  features: any;

  // ========== 展示 ==========

  /** 车型图片封面 URL */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'cover_image_url',
    nullable: true,
    comment: '封面图URL',
  })
  coverImageUrl: string | null;

  /** 车型描述 */
  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
    comment: '车型描述',
  })
  description: string | null;

  // ========== 状态 ==========

  /** 是否上架 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否上架：0否 1是',
  })
  isActive: number;

  /** 排序权重 */
  @Column({
    type: 'int',
    name: 'sort_order',
    default: 0,
    comment: '排序权重',
  })
  sortOrder: number;

  // ========== 关系 ==========

  @OneToMany(() => Vehicle, (vehicle) => vehicle.model)
  vehicles?: Vehicle[];
}
