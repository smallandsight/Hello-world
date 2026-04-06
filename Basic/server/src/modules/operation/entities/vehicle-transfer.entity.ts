import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 调拨状态枚举
 */
export enum TransferStatus {
  /** 待审批 */
  PENDING = 'pending',
  /** 已审批 */
  APPROVED = 'approved',
  /** 进行中 */
  IN_TRANSIT = 'in_transit',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/**
 * 车辆调拨单Entity
 */
@Entity('vehicle_transfer')
@Index(['vehicleId'])
@Index(['fromStoreId'])
@Index(['toStoreId'])
@Index(['status'])
export class VehicleTransfer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 调拨单号 */
  @Column({ type: 'varchar', length: 30, unique: true, comment: '调拨单号' })
  transferNo: string;

  /** 车辆ID */
  @Column({ type: 'bigint', comment: '车辆ID' })
  vehicleId: string;

  /** 车辆ID（冗余） */
  @Column({ type: 'varchar', length: 20, nullable: true, comment: '车牌号' })
  plateNumber: string;

  /** 调出门店ID */
  @Column({ type: 'bigint', comment: '调出门店ID' })
  fromStoreId: string;

  /** 调出门店名称 */
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '调出门店名称' })
  fromStoreName: string;

  /** 调入门店ID */
  @Column({ type: 'bigint', comment: '调入门店ID' })
  toStoreId: string;

  /** 调入门店名称 */
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '调入门店名称' })
  toStoreName: string;

  /** 状态 */
  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
    comment: '状态',
  })
  status: TransferStatus;

  /** 预计调拨时间 */
  @Column({ type: 'datetime', comment: '预计调拨时间' })
  scheduledAt: Date;

  /** 实际出发时间 */
  @Column({ type: 'datetime', nullable: true, comment: '实际出发时间' })
  departedAt: Date;

  /** 实际到达时间 */
  @Column({ type: 'datetime', nullable: true, comment: '实际到达时间' })
  arrivedAt: Date;

  /** 调拨原因 */
  @Column({ type: 'varchar', length: 500, comment: '调拨原因' })
  reason: string;

  /** 备注 */
  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string;

  /** 审批人ID */
  @Column({ type: 'bigint', nullable: true, comment: '审批人ID' })
  approverId: string;

  /** 审批人姓名 */
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '审批人姓名' })
  approverName: string;

  /** 审批时间 */
  @Column({ type: 'datetime', nullable: true, comment: '审批时间' })
  approvedAt: Date;

  /** 审批备注 */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '审批备注' })
  approveRemark: string;

  /** 负责人ID */
  @Column({ type: 'bigint', nullable: true, comment: '负责人ID' })
  handlerId: string;

  /** 负责人姓名 */
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '负责人姓名' })
  handlerName: string;

  /** 创建人ID */
  @Column({ type: 'bigint', nullable: true, comment: '创建人ID' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}