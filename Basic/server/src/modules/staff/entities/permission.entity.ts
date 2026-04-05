/**
 * 权限实体（permissions 表）
 * 树形结构的资源权限定义
 */
import { Entity, Column, Index, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  /** 权限名称 */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'permission_name',
    comment: '权限名称',
  })
  permissionName: string;

  /** 权限码（如 order:view, user:create） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'permission_code',
    comment: '权限码',
  })
  permissionCode: string;

  /** 资源类型（模块分组）：order/user/vehicle/payment/coupon/ticket/staff/system */
  @Column({
    type: 'varchar',
    length: 30,
    name: 'resource_type',
    comment: '资源类型/模块',
  })
  resourceType: string;

  /**
   * 权限类型：menu(菜单)/button(按钮)/api(接口)
   */
  @Column({
    type: 'enum',
    enum: ['menu', 'button', 'api'],
    name: 'permission_type',
    default: 'api',
    comment: '类型：menu/button/api',
  })
  permissionType: 'menu' | 'button' | 'api';

  // ========== 层级关系 ==========

  /** 父级权限 ID（0=顶级） */
  @Index()
  @Column({ type: 'bigint', name: 'parent_id', default: 0, comment: '父级ID' })
  parentId: number;

  /** 排序权重（同级排序） */
  @Column({
    type: 'int',
    name: 'sort_order',
    default: 0,
    comment: '排序',
  })
  sortOrder: number;

  /** 路径/路由（menu类型使用） */
  @Column({
    type: 'varchar',
    length: 200,
    name: 'path',
    nullable: true,
    comment: '路由路径',
  })
  path: string | null;

  /** 图标（可选） */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'icon',
    nullable: true,
    comment: '图标',
  })
  icon: string | null;

  // ========== 状态 ==========

  /** 是否启用 */
  @Column({
    type: 'tinyint',
    name: 'is_active',
    default: 1,
    comment: '是否启用',
  })
  isActive: number;

  // ========== 关系 ==========

  /** 多对多：角色关联 */
  @ManyToMany(() => Role, (role) => role.permissions)
  roles?: Role[];
}
