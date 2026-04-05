/**
 * 用户实体（users 表）
 * 对齐 DDL：29 字段，包含基本信息、支付宝绑定、会员、积分等
 */
import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { DriverLicense } from './driver-license.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('users')
export class User extends BaseEntity {
  // ========== 基本信息 ==========

  /** 手机号（脱敏存储） */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 20,
    name: 'phone',
    comment: '手机号',
  })
  phone: string;

  /** 昵称 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'nickname',
    nullable: true,
    comment: '昵称',
  })
  nickname: string | null;

  /** 头像 URL */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'avatar_url',
    nullable: true,
    comment: '头像URL',
  })
  avatarUrl: string | null;

  @Column({ type: 'tinyint', name: 'gender', default: 0, comment: '性别：0未知 1男 2女' })
  gender: number;

  // ========== 支付宝绑定 ==========

  /** 支付宝 user_id */
  @Index()
  @Column({
    type: 'varchar',
    length: 64,
    name: 'alipay_user_id',
    nullable: true,
    comment: '支付宝用户ID',
  })
  alipayUserId: string | null;

  /** 支付宝 union_id */
  @Column({
    type: 'varchar',
    length: 128,
    name: 'alipay_union_id',
    nullable: true,
    comment: '支付宝UnionID',
  })
  alipayUnionId: string | null;

  // ========== 实名认证 ==========

  /** 是否已实名认证 */
  @Column({
    type: 'tinyint',
    name: 'is_verified',
    default: 0,
    comment: '是否实名认证：0否 1是',
  })
  isVerified: number;

  /** 真实姓名（加密存储） */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'real_name',
    nullable: true,
    select: false, // 默认不查询
    comment: '真实姓名（加密）',
  })
  realName: string | null;

  /** 身份证号（加密存储） */
  @Column({
    type: 'varchar',
    length: 100,
    name: 'id_card_no',
    nullable: true,
    select: false,
    comment: '身份证号（加密）',
  })
  idCardNo: string | null;

  // ========== 会员体系 ==========

  /** 会员等级 ID（关联 user_levels.id） */
  @Column({
    type: 'bigint',
    name: 'level_id',
    default: 1,
    comment: '会员等级ID',
  })
  levelId: number;

  /** 当前积分余额 */
  @Column({
    type: 'bigint',
    name: 'points_balance',
    default: 0,
    comment: '积分余额',
  })
  pointsBalance: number;

  /** 累计消费金额（分为单位） */
  @Column({
    type: 'bigint',
    name: 'total_spend_cents',
    default: 0,
    comment: '累计消费金额(分)',
  })
  totalSpendCents: number;

  /** 累计骑行次数 */
  @Column({
    type: 'int',
    name: 'total_rides',
    default: 0,
    comment: '累计骑行次数',
  })
  totalRides: number;

  // ========== 押金 ==========

  /** 押金状态：0未缴纳 1已缴 2退押中 3已退 */
  @Column({
    type: 'tinyint',
    name: 'deposit_status',
    default: 0,
    comment: '押金状态：0未缴 1已缴 2退押中 3已退',
  })
  depositStatus: number;

  /** 押金金额（分） */
  @Column({
    type: 'bigint',
    name: 'deposit_amount',
    default: 0,
    comment: '押金金额(分)',
  })
  depositAmount: number;

  // ========== 状态与安全 ==========

  /** 账号状态：0正常 1禁用 2注销 */
  @Column({
    type: 'tinyint',
    name: 'status',
    default: 0,
    comment: '账号状态：0正常 1禁用 2注销',
  })
  status: number;

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

  // ========== 邀请关系 ==========

  /** 邀请人用户 ID */
  @Column({
    type: 'bigint',
    name: 'inviter_id',
    nullable: true,
    comment: '邀请人ID',
  })
  inviterId: number | null;

  /** 邀请码 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 20,
    name: 'invite_code',
    nullable: true,
    comment: '邀请码',
  })
  inviteCode: string | null;

  // ========== 关系 ==========

  /** 一对一：驾驶证信息 */
  @OneToOne(() => DriverLicense, (license) => license.user)
  driverLicense?: DriverLicense;

  /** 一对多：用户的订单 */
  @OneToMany(() => Order, (order) => order.user)
  orders?: Order[];
}
