/**
 * 车辆实体（vehicles 表）
 * 核心业务实体，包含状态机、保险、年检等关键信息
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Store } from './store.entity';
import { VehicleModel } from './vehicle-model.entity';
import { VehicleImage } from './vehicle-image.entity';
import { VehicleMaintenance } from './vehicle-maintenance.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  /** 车辆编号（唯一标识，如 GY-E001） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'vehicle_no',
    comment: '车辆编号',
  })
  vehicleNo: string;

  // ========== 关联 ==========

  /** 所属门店 ID */
  @Index()
  @Column({ type: 'bigint', name: 'store_id', comment: '门店ID' })
  storeId: number;

  /** 车型 ID */
  @Index()
  @Column({ type: 'bigint', name: 'model_id', comment: '车型ID' })
  modelId: number;

  // ========== 状态机 ==========

  /**
   * 车辆状态：1空闲 2使用中 3维护中 4已下线 5故障
   * 对应 shared/types/vehicle.types.ts 的 VehicleStatus 枚举
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 1,
    comment: '状态：1空闲 2使用中 3维护中 4已下线 5故障',
  })
  status: number;

  /** 当前电量百分比（0-100，电动车专用） */
  @Column({
    type: 'tinyint',
    name: 'battery_level',
    nullable: true,
    comment: '电量(%)',
  })
  batteryLevel: number | null;

  // ========== 位置信息 ==========

  /** 当前纬度（实时定位） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    name: 'current_lat',
    nullable: true,
    comment: '当前纬度',
  })
  currentLat: number | null;

  /** 当前经度 */
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 7,
    name: 'current_lng',
    nullable: true,
    comment: '当前经度',
  })
  currentLng: number | null;

  // ========== 保险与年检 ==========

  /** 保险到期日期 */
  @Column({
    type: 'date',
    name: 'insurance_expiry_date',
    nullable: true,
    comment: '保险到期日',
  })
  insuranceExpiryDate: Date | null;

  /** 年检到期日期 */
  @Column({
    type: 'date',
    name: 'inspection_expiry_date',
    nullable: true,
    comment: '年检到期日',
  })
  inspectionExpiryDate: Date | null;

  // ========== 统计 ==========

  /** 累计行驶里程（km） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'total_mileage',
    default: 0,
    comment: '累计里程(km)',
  })
  totalMileage: number;

  /** 累计骑行次数 */
  @Column({
    type: 'int',
    name: 'total_trips',
    default: 0,
    comment: '累计骑行次数',
  })
  totalTrips: number;

  // ========== 展示 ==========

  /** 车辆描述/备注 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'remark',
    nullable: true,
    comment: '备注',
  })
  remark: string | null;

  /** 是否启用 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否启用',
  })
  isActive: number;

  // ========== 关系 ==========

  @ManyToOne(() => Store, (store) => store.vehicles)
  @JoinColumn([{ name: 'store_id', referencedColumnName: 'id' }])
  store?: Store;

  @ManyToOne(() => VehicleModel, (model) => model.vehicles)
  @JoinColumn([{ name: 'model_id', referencedColumnName: 'id' }])
  model?: VehicleModel;

  /** 一对多：车辆图片 */
  @OneToMany(() => VehicleImage, (img) => img.vehicle)
  images?: VehicleImage[];

  /** 一对多：维护记录 */
  @OneToMany(
    () => VehicleMaintenance,
    (maint) => maint.vehicle,
  )
  maintenanceRecords?: VehicleMaintenance[];

  /** 一对多：订单关联 */
  @OneToMany(() => Order, (order) => order.vehicle)
  orders?: Order[];
}
