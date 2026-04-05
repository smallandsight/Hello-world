/**
 * 门店实体（stores 表）
 * 包含 LBS 坐标、营业时间、服务范围等信息
 */
import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Vehicle } from './vehicle.entity';

@Entity('stores')
export class Store extends BaseEntity {
  /** 门店名称 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'store_name',
    comment: '门店名称',
  })
  storeName: string;

  /** 门店编码（唯一标识） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'store_code',
    comment: '门店编码',
  })
  storeCode: string;

  // ========== 地址与坐标 ==========

  /** 省份 */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'province',
    comment: '省份',
  })
  province: string;

  /** 城市 */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'city',
    comment: '城市',
  })
  city: string;

  /** 区县 */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'district',
    nullable: true,
    comment: '区县',
  })
  district: string | null;

  /** 详细地址 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'address',
    comment: '详细地址',
  })
  address: string;

  /** 纬度（用于 LBS 定位） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'latitude',
    comment: '纬度',
  })
  latitude: number;

  /** 经度 */
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 7,
    name: 'longitude',
    comment: '经度',
  })
  longitude: number;

  /** GeoHash 编码（加速附近查询） */
  @Index()
  @Column({
    type: 'varchar',
    length: 12,
    name: 'geohash',
    nullable: true,
    comment: 'GeoHash编码',
  })
  geohash: string | null;

  // ========== 联系方式 ==========

  /** 联系电话 */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'phone',
    nullable: true,
    comment: '联系电话',
  })
  phone: string | null;

  // ========== 营业信息 ==========

  /** 营业时间开始 */
  @Column({
    type: 'varchar',
    length: 10,
    name: 'open_time',
    default: '08:00',
    comment: '营业时间(开始)',
  })
  openTime: string;

  /** 营业时间结束 */
  @Column({
    type: 'varchar',
    length: 10,
    name: 'close_time',
    default: '22:00',
    comment: '营业时间(结束)',
  })
  closeTime: string;

  /** 服务半径（米） */
  @Column({
    type: 'int',
    name: 'service_radius_meters',
    default: 3000,
    comment: '服务半径(米)',
  })
  serviceRadiusMeters: number;

  // ========== 状态 ==========

  /** 是否启用 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否启用：0否 1是',
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

  /** 一对多：该门店下的车辆 */
  @OneToMany(() => Vehicle, (vehicle) => vehicle.store)
  vehicles?: Vehicle[];
}
