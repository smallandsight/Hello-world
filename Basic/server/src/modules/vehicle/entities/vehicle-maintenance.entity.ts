/**
 * 车辆维护记录实体（vehicle_maintenance 表）
 * 记录车辆的保养、维修、年检、保险等维护操作
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

@Entity('vehicle_maintenance')
export class VehicleMaintenance extends BaseEntity {
  /** 车辆 ID */
  @Index()
  @Column({ type: 'bigint', name: 'vehicle_id', comment: '车辆ID' })
  vehicleId: number;

  // ========== 维护信息 ==========

  /**
   * 维护类型：1定期保养 2故障维修 3年检 4保险续保
   * 对应 MaintenanceType 枚举
   */
  @Column({
    type: 'tinyint',
    name: 'maintenance_type',
    comment: '类型：1保养 2维修 3年检 4保险',
  })
  maintenanceType: number;

  /** 维护标题 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'title',
    comment: '维护标题',
  })
  title: string;

  /** 维护描述/详情 */
  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
    comment: '维护描述',
  })
  description: string | null;

  /** 维护费用（分） */
  @Column({
    type: 'bigint',
    name: 'cost_cents',
    default: 0,
    comment: '费用(分)',
  })
  costCents: number;

  // ========== 时间 ==========

  /** 计划开始时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'planned_start_at',
    nullable: true,
    comment: '计划开始时间',
  })
  plannedStartAt: Date | null;

  /** 实际开始时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'actual_start_at',
    nullable: true,
    comment: '实际开始时间',
  })
  actualStartAt: Date | null;

  /** 完成时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'completed_at',
    nullable: true,
    comment: '完成时间',
  })
  completedAt: Date | null;

  // ========== 状态 ==========

  /**
   * 状态：0待处理 1进行中 2已完成 3已取消
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0待处理 1进行中 2已完成 3已取消',
  })
  status: number;

  /** 处理人/技工 ID */
  @Column({
    type: 'bigint',
    name: 'handler_id',
    nullable: true,
    comment: '处理人ID',
  })
  handlerId: number | null;

  // ========== 关系 ==========

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenanceRecords)
  @JoinColumn([{ name: 'vehicle_id', referencedColumnName: 'id' }])
  vehicle?: Vehicle;
}
