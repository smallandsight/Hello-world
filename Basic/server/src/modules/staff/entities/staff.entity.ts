/**
 * 商家员工实体（staff 表）
 * 管理后台的员工账号，含登录统计、角色关联
 */
import {
  Entity,
  Column,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Role } from './role.entity';

@Entity('staff')
export class Staff extends BaseEntity {
  // ========== 账号信息 ==========

  /** 工号（唯一标识） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'staff_no',
    comment: '工号',
  })
  staffNo: string;

  /** 登录账号（手机号或邮箱） */
  @Index()
  @Column({
    type: 'varchar',
    length: 100,
    name: 'account',
    comment: '登录账号(手机号/邮箱)',
  })
  account: string;

  /** 密码哈希（bcrypt） */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
    select: false, // 默认不查询密码
    comment: '密码哈希(bcrypt)',
  })
  passwordHash: string;

  // ========== 基本信息 ==========

  /** 姓名 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'real_name',
    comment: '真实姓名',
  })
  realName: string;

  /** 手机号 */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'phone',
    nullable: true,
    comment: '手机号',
  })
  phone: string | null;

  /** 头像 URL */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'avatar_url',
    nullable: true,
    comment: '头像URL',
  })
  avatarUrl: string | null;

  // ========== 所属门店 ==========

  /** 所属门店 ID（数据权限范围参考） */
  @Index()
  @Column({ type: 'bigint', name: 'store_id', nullable: true, comment: '所属门店ID' })
  storeId: number | null;

  // ========== 状态与安全 ==========

  /**
   * 状态：0正常 1禁用 2锁定
   */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '状态：0正常 1禁用 2锁定',
  })
  status: number;

  // ========== 登录统计 ==========

  /** 最后登录时间 */
  @Column({
    type: 'datetime',
    precision: 3,
    name: 'last_login_at',
    nullable: true,
    comment: '最后登录时间',
  })
  lastLoginAt: Date | null;

  /** 最后登录 IP */
  @Column({
    type: 'varchar',
    length: 45,
    name: 'last_login_ip',
    nullable: true,
    comment: '最后登录IP',
  })
  lastLoginIp: string | null;

  /** 累计登录次数 */
  @Column({
    type: 'int',
    name: 'login_count',
    default: 0,
    comment: '累计登录次数',
  })
  loginCount: number;

  // ========== 关系 ==========

  /** 多对多：员工-角色关系 */
  @ManyToMany(() => Role, (role) => role.staffs)
  roles?: Role[];
}
