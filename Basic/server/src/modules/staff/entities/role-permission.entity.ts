/**
 * 角色-权限关联表实体（role_permissions 表）
 * RBAC 多对多中间表
 */
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission extends BaseEntity {
  /** 角色 ID */
  @Index()
  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  /** 权限 ID */
  @Index()
  @Column({ type: 'bigint', name: 'permission_id', comment: '权限ID' })
  permissionId: number;

  /** 创建人（记录谁授权的） */
  @Column({
    type: 'bigint',
    name: 'creator_id',
    nullable: true,
    comment: '授权人ID',
  })
  creatorId: number | null;

  // ========== 关系 ==========

  @ManyToOne(() => Role)
  @JoinColumn([{ name: 'role_id', referencedColumnName: 'id' }])
  role?: Role;

  @ManyToOne(() => Permission)
  @JoinColumn([{ name: 'permission_id', referencedColumnName: 'id' }])
  permission?: Permission;
}
