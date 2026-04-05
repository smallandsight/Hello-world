/**
 * 用户等级实体（user_levels 表）
 * 会员等级配置，包含升级条件、权益等
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('user_levels')
export class UserLevel extends BaseEntity {
  /** 等级名称 */
  @Column({
    type: 'varchar',
    length: 50,
    name: 'level_name',
    comment: '等级名称',
  })
  levelName: string;

  /** 等级标识码 */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 30,
    name: 'level_code',
    comment: '等级标识（如 bronze/silver/gold/platinum）',
  })
  levelCode: string;

  /** 等级级别（数字越大等级越高） */
  @Column({
    type: 'tinyint',
    name: 'level_tier',
    comment: '等级级别(1=普通 2=银 3=金 4=铂金)',
  })
  levelTier: number;

  /** 升级所需累计消费金额（分） */
  @Column({
    type: 'bigint',
    name: 'upgrade_spend_cents',
    default: 0,
    comment: '升级所需消费金额(分)',
  })
  upgradeSpendCents: number;

  /** 升级所需骑行次数 */
  @Column({
    type: 'int',
    name: 'upgrade_rides',
    default: 0,
    comment: '升级所需骑行次数',
  })
  upgradeRides: number;

  /** 积分倍率（百分比，如 120 表示1.2倍） */
  @Column({
    type: 'smallint',
    name: 'points_rate',
    default: 100,
    comment: '积分获取倍率(%)',
  })
  pointsRate: number;

  /** 折扣率（百分比，如 95 表示95折/5% off） */
  @Column({
    type: 'smallint',
    name: 'discount_rate',
    default: 100,
    comment: '折扣率(%)，100=无折扣',
  })
  discountRate: number;

  /** 权益描述 JSON */
  @Column({
    type: 'json',
    name: 'benefits',
    nullable: true,
    comment: '权益列表JSON [{name,desc}]',
  })
  benefits: any;

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
    comment: '是否启用：0否 1是',
  })
  isActive: number;
}
