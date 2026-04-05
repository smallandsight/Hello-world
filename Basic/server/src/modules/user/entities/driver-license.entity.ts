/**
 * 驾驶证实体（driver_licenses 表）
 * 存储用户上传的驾驶证信息及审核流程
 */
import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { User } from './user.entity';

@Entity('driver_licenses')
export class DriverLicense extends BaseEntity {
  /** 所属用户 ID */
  @Index()
  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  // ========== 驾驶证基本信息 ==========

  /** 驾驶证号（加密存储） */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'license_no',
    nullable: true,
    select: false,
    comment: '驾驶证号(加密)',
  })
  licenseNo: string | null;

  /** 准驾车型 */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'license_class',
    nullable: true,
    comment: '准驾车型',
  })
  licenseClass: string | null;

  /** 有效期起始日期 */
  @Column({
    type: 'date',
    name: 'valid_from',
    nullable: true,
    comment: '有效期起始',
  })
  validFrom: Date | null;

  /** 有效期截止日期 */
  @Column({
    type: 'date',
    name: 'valid_to',
    nullable: true,
    comment: '有效期截止',
  })
  validTo: Date | null;

  // ========== 图片 ==========

  /** 驾驶证正面照片 URL（OSS） */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'front_image_url',
    nullable: true,
    comment: '驾驶证正面照URL',
  })
  frontImageUrl: string | null;

  /** 驾驶证反面照片 URL */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'back_image_url',
    nullable: true,
    comment: '驾驶证反面照URL',
  })
  backImageUrl: string | null;

  // ========== 审核流程 ==========

  /** 审核状态：0待审核 1已通过 2已驳回 */
  @Column({
    type: 'tinyint',
    name: 'audit_status',
    default: 0,
    comment: '审核状态：0待审核 1通过 2驳回',
  })
  auditStatus: number;

  /** 审核人 ID */
  @Column({
    type: 'bigint',
    name: 'auditor_id',
    nullable: true,
    comment: '审核人ID',
  })
  auditorId: number | null;

  /** 审核时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'audited_at',
    nullable: true,
    comment: '审核时间',
  })
  auditedAt: Date | null;

  /** 驳回原因 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'reject_reason',
    nullable: true,
    comment: '驳回原因',
  })
  rejectReason: string | null;

  // ========== 关系 ==========

  @OneToOne(() => User, (user) => user.driverLicense)
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user?: User;
}
