import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 异常类型枚举
 */
export enum ExceptionType {
  /** 超时未取 */
  OVERDUE_PICKUP = 'overdue_pickup',
  /** 长期未还 */
  OVERDUE_RETURN = 'overdue_return',
  /** 支付失败 */
  PAYMENT_FAILED = 'payment_failed',
  /** 车辆故障 */
  VEHICLE_MALFUNCTION = 'vehicle_malfunction',
  /** 用户投诉 */
  USER_COMPLAINT = 'user_complaint',
  /** 违章处理 */
  TRAFFIC_VIOLATION = 'traffic_violation',
  /** 押金纠纷 */
  DEPOSIT_DISPUTE = 'deposit_dispute',
  /** 评价争议 */
  REVIEW_DISPUTE = 'review_dispute',
  /** 发票问题 */
  INVOICE_ISSUE = 'invoice_issue',
  /** 数据异常 */
  DATA_ABNORMAL = 'data_abnormal',
}

/**
 * 异常状态枚举
 */
export enum ExceptionStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 已解决 */
  RESOLVED = 'resolved',
  /** 已关闭 */
  CLOSED = 'closed',
}

/**
 * 异常处理日志Entity
 */
@Entity('exception_log')
@Index(['type', 'status'])
@Index(['orderId'])
@Index(['createdAt'])
export class ExceptionLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  /** 异常类型 */
  @Column({
    type: 'enum',
    enum: ExceptionType,
    comment: '异常类型',
  })
  type: ExceptionType;

  /** 异常状态 */
  @Column({
    type: 'enum',
    enum: ExceptionStatus,
    default: ExceptionStatus.PENDING,
    comment: '异常状态',
  })
  status: ExceptionStatus;

  /** 关联订单ID */
  @Column({ type: 'bigint', nullable: true, comment: '关联订单ID' })
  orderId: string;

  /** 关联用户ID */
  @Column({ type: 'bigint', nullable: true, comment: '关联用户ID' })
  userId: string;

  /** 关联车辆ID */
  @Column({ type: 'bigint', nullable: true, comment: '关联车辆ID' })
  vehicleId: string;

  /** 异常标题 */
  @Column({ type: 'varchar', length: 200, comment: '异常标题' })
  title: string;

  /** 异常描述 */
  @Column({ type: 'text', comment: '异常描述' })
  description: string;

  /** 触发条件 JSON */
  @Column({ type: 'json', nullable: true, comment: '触发条件' })
  triggerConditions: Record<string, any>;

  /** 异常数据 JSON */
  @Column({ type: 'json', nullable: true, comment: '异常数据' })
  exceptionData: Record<string, any>;

  /** SOP编号 */
  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'SOP编号' })
  sopId: string;

  /** 处理流程 JSON */
  @Column({ type: 'json', nullable: true, comment: '处理流程' })
  processFlow: ProcessStep[];

  /** 当前处理步骤 */
  @Column({ type: 'int', default: 0, comment: '当前处理步骤' })
  currentStep: number;

  /** 处理人ID */
  @Column({ type: 'bigint', nullable: true, comment: '处理人ID' })
  handlerId: string;

  /** 处理人姓名 */
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '处理人姓名' })
  handlerName: string;

  /** 处理结果 */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '处理结果' })
  result: string;

  /** 处理备注 */
  @Column({ type: 'text', nullable: true, comment: '处理备注' })
  remark: string;

  /** 处理时间 */
  @Column({ type: 'datetime', nullable: true, comment: '处理时间' })
  handledAt: Date;

  /** 解决时间 */
  @Column({ type: 'datetime', nullable: true, comment: '解决时间' })
  resolvedAt: Date;

  /** 优先级 1-5 */
  @Column({ type: 'int', default: 3, comment: '优先级1-5' })
  priority: number;

  /** 超时时间（小时） */
  @Column({ type: 'int', default: 24, comment: '超时时间（小时）' })
  timeoutHours: number;

  /** 是否超时 */
  @Column({ type: 'boolean', default: false, comment: '是否超时' })
  isTimeout: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}

/**
 * 处理步骤接口
 */
export interface ProcessStep {
  step: number;
  action: string;
  description: string;
  handler?: string;
  handledAt?: Date;
  result?: string;
}

/**
 * SOP定义接口
 */
export interface SOPDefinition {
  id: string;
  type: ExceptionType;
  name: string;
  description: string;
  steps: SOPStep[];
  timeout: number;
  priority: number;
}

/**
 * SOP步骤接口
 */
export interface SOPStep {
  step: number;
  action: string;
  description: string;
  assignTo?: string;
  autoAction?: string;
  timeout: number;
}