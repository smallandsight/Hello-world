import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** 站内信 */
  IN_APP = 'in_app',
  /** 短信 */
  SMS = 'sms',
  /** 订阅消息 */
  SUBSCRIBE = 'subscribe',
  /** 推送 */
  PUSH = 'push',
}

/**
 * 消息模板Entity
 */
@Entity('message_template')
@Index(['code'], { unique: true })
@Index(['type', 'status'])
export class MessageTemplate {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 模板编码 */
  @Column({ type: 'varchar', length: 50, unique: true, comment: '模板编码' })
  code: string;

  /** 模板名称 */
  @Column({ type: 'varchar', length: 100, comment: '模板名称' })
  name: string;

  /** 消息类型 */
  @Column({
    type: 'enum',
    enum: MessageType,
    comment: '消息类型',
  })
  type: MessageType;

  /** 模板标题 */
  @Column({ type: 'varchar', length: 200, comment: '模板标题' })
  title: string;

  /** 模板内容 */
  @Column({ type: 'text', comment: '模板内容' })
  content: string;

  /** 变量列表 JSON */
  @Column({ type: 'json', nullable: true, comment: '变量列表' })
  variables: string[];

  /** 状态 */
  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  status: boolean;

  /** 触发场景 */
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '触发场景' })
  triggerScene: string;

  /** 排序 */
  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;

  /** 备注 */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}