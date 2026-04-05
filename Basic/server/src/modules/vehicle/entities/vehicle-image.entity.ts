/**
 * 车辆图片实体（vehicle_images 表）
 * 存储车辆的多张展示图片/细节图
 */
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Vehicle } from './vehicle.entity';

@Entity('vehicle_images')
export class VehicleImage extends BaseEntity {
  /** 所属车辆 ID */
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '车辆ID' })
  vehicleId: number;

  /** 图片 URL（OSS 地址） */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'image_url',
    comment: '图片URL',
  })
  imageUrl: string;

  /** 图片类型：cover(封面)/detail(详情)/damage(损坏) */
  @Column({
    type: 'enum',
    enum: ['cover', 'detail', 'damage'],
    name: 'image_type',
    default: 'detail',
    comment: '图片类型：cover/detail/damage',
  })
  imageType: 'cover' | 'detail' | 'damage';

  /** 排序权重（同类型内排序） */
  @Column({
    type: 'int',
    name: 'sort_order',
    default: 0,
    comment: '排序',
  })
  sortOrder: number;

  // ========== 关系 ==========

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.images)
  @JoinColumn([{ name: 'vehicle_id', referencedColumnName: 'id' }])
  vehicle?: Vehicle;
}
