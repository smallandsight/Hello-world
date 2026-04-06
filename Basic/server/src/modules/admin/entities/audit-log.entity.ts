/**
 * 操作审计日志实体（audit_logs 表）
 * 记录所有关键操作，用于安全审计和问题追溯
 */
import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  /** 操作者ID (用户ID或员工ID) */
  @Index()
  @Column({ type: 'bigint', name: 'operator_id', comment: '操作者ID' })
  operatorId: number;

  /**
   * 操作者角色
   * user(普通用户)/staff(商家员工)/system(系统)/admin(超级管理员)
   */
  @Column({
    type: 'enum',
    enum: ['user', 'staff', 'system', 'admin'],
    name: 'operator_role',
    default: 'user',
    comment: '操作者角色',
  })
  operatorRole: 'user' | 'staff' | 'system' | 'admin';

  /** 操作类型 */
  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    name: 'action',
    comment: '操作类型(login/logout/order_create/payment/cancel/role_change等)',
  })
  action: string;

  /** 目标模块名 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'target_module',
    nullable: true,
    comment: '目标模块(user/order/payment/vehicle/store等)',
  })
  targetModule: string | null;

  /** 目标记录 ID */
  @Column({ type: 'bigint', name: 'target_id', nullable: true, comment: '目标记录ID' })
  targetId: number | null;

  /** 变更详情 JSON（前后值对比）*/
  @Column({
    type: 'json',
    name: 'detail',
    nullable: true,
    comment: '变更详情(JSON格式)',
  })
  detail: Record<string, any> | null;

  /** 来源 IP 地址 */
  @Column({ type: 'varchar', length: 45, name: 'ip', nullable: true, comment: '来源IP' })
  ip: string | null;

  /** User-Agent */
  @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true, comment: 'User-Agent' })
  userAgent: string | null;
}
