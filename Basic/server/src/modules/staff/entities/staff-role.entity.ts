/**
 * 员工-角色关联表实体（staff_roles 表）
 * RBAC 多对多中间表，记录员工被分配的角色
 */
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Staff } from './staff.entity';
import { Role } from './role.entity';

@Entity('staff_roles')
export class StaffRole extends BaseEntity {
  /** 员工 ID */
  @Index()
  @Column({ type: 'bigint', name: 'staff_id', comment: '员工ID' })
  staffId: number;

  /** 角色 ID */
  @Index()
  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  /** 分配人 ID */
  @Column({
    type: 'bigint',
    name: 'assigner_id',
    nullable: true,
    comment: '分配人ID',
  })
  assignerId: number | null;

  // ========== 关系 ==========

  @ManyToOne(() => Staff)
  @JoinColumn([{ name: 'staff_id', referencedColumnName: 'id' }])
  staff?: Staff;

  @ManyToOne(() => Role, (role) => role.staffRoles)
  @JoinColumn([{ name: 'role_id', referencedColumnName: 'id' }])
  role?: Role;
}
