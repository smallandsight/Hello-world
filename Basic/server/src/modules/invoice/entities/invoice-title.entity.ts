import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 发票抬头 (T3W10-2)
 *
 * 用户可维护个人/公司发票抬头信息
 */
@Entity('invoice_title')
export class InvoiceTitle extends BaseEntity {
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  userId: number;

  /** 抬头名称 */
  @Column({ type: 'varchar', length: 200, name: 'title_name', comment: '抬头名称' })
  titleName: string;

  /**
   * 税号
   * 个人发票为身份证号或空
   */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'tax_no',
    nullable: true,
    comment: '税号/身份证号',
  })
  taxNo?: string | null;

  /** 类型 */
  @Column({
    type: 'enum',
    enum: ['PERSONAL', 'COMPANY'],
    name: 'type',
    default: 'PERSONAL',
    comment: '类型: 个人/企业',
  })
  type: 'PERSONAL' | 'COMPANY';

  /** 地址（企业抬头必填）*/
  @Column({ type: 'varchar', length: 255, name: 'address', nullable: true, comment: '地址' })
  address?: string | null;

  /** 电话 */
  @Column({ type: 'varchar', length: 30, name: 'phone', nullable: true, comment: '电话' })
  phone?: string | null;

  /** 邮箱（用于电子发票发送）*/
  @Column({ type: 'varchar', length: 100, name: 'email', nullable: true, comment: '邮箱' })
  email?: string | null;

  /** 开户银行 */
  @Column({ type: 'varchar', length: 100, name: 'bank_name', nullable: true, comment: '开户银行' })
  bankName?: string | null;

  /** 银行账号 */
  @Column({ type: 'varchar', length: 50, name: 'bank_account', nullable: true, comment: '银行账号' })
  bankAccount?: string | null;

  /** 是否默认抬头 */
  @Column({ type: 'tinyint', name: 'is_default', default: 0, comment: '是否默认' })
  isDefault: number;
}
