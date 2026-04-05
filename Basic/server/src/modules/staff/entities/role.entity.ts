/**
 * 角色实体（roles 表）
 * RBAC 权限模型中的角色，含数据权限范围
 */
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { StaffRole } from './staff-role.entity';

@Entity('roles')
export class Role extends BaseEntity {
  /** 角色名称 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'role_name',
    comment: '角色名称',
  })
  roleName: string;

  /** 角色标识码（唯一） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'role_code',
    comment: '角色编码（如 admin/operator/cashier）',
  })
  roleCode: string;

  /** 角色描述 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'description',
    nullable: true,
    comment: '角色描述',
  })
  description: string | null;

  /**
   * 数据权限范围：
   * all(全部数据)/self(仅本人)/store(本门店)/custom(自定义)
   */
  @Column({
    type: 'enum',
    enum: ['all', 'self', 'store', 'custom'],
    name: 'data_scope',
    default: 'store',
    comment: '数据权限范围：all/self/store/custom',
  })
  dataScope: 'all' | 'self' | 'store' | 'custom';

  /** 是否为系统内置角色（不可删除） */
  @Column({
    type: 'tinyint',
    name: 'is_builtin',
    default: 0,
    comment: '系统内置：0否 1是',
  })
  isBuiltin: number;

  /** 排序权重 */
  @Column({
    type: 'int',
    name: 'sort_order',
    default: 0,
    comment: '排序',
  })
  sortOrder: number;

  /** 是否启用 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否启用',
  })
  isActive: number;

  // ========== 关系 ==========

  @OneToMany(() => StaffRole, (sr) => sr.role)
  staffRoles?: StaffRole[];
}
