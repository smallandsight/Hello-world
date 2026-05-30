/**
 * GPS 轨迹点实体
 * 存储车辆GPS定位数据，支持历史轨迹回放
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('gps_points')
export class GpsPoint extends BaseEntity {
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '车辆ID' })
  vehicleId: number;

  @Column({ type: 'bigint', name: 'order_id', nullable: true, comment: '关联订单ID' })
  orderId?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'longitude', comment: '经度(GCJ02)' })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'latitude', comment: '纬度(GCJ02)' })
  latitude: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'speed', default: 0, comment: '速度(km/h)' })
  speed: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, name: 'heading', default: 0, comment: '方向角(0-359)' })
  heading: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'accuracy', nullable: true, comment: '定位精度(米)' })
  accuracy?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'altitude', nullable: true, comment: '海拔(米)' })
  altitude?: number;

  @Column({ type: 'bigint', name: 'odometer', nullable: true, comment: '里程表读数(米)' })
  odometer?: number;

  @Column({ type: 'int', name: 'battery_level', nullable: true, comment: '电量百分比(0-100)' })
  batteryLevel?: number;

  @Column({ type: 'varchar', length: 16, name: 'source', comment: '数据来源 tbox/app/ble/manual' })
  source: string;

  @Index()
  @Column({ type: 'datetime', precision: 3, name: 'timestamp', comment: '上报时间' })
  timestamp: Date;
}
