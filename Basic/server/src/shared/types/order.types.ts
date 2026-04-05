/**
 * 订单相关类型定义
 * 状态枚举、状态机转换规则
 */

/** 订单状态枚举（对齐 DDL TINYINT） */
export enum OrderStatus {
  /** 待支付 */
  PENDING_PAYMENT = 10,
  /** 待取车 */
  PICKUP_PENDING = 20,
  /** 使用中 */
  IN_USE = 30,
  /** 待还车 */
  RETURN_PENDING = 40,
  /** 待结算 */
  SETTLING = 50,
  /** 已完成 */
  COMPLETED = 60,
  /** 已取消 */
  CANCELLED = 70,
  /** 异常 */
  ABNORMAL = 80,
}

/** 订单状态显示名称映射 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: '待支付',
  [OrderStatus.PICKUP_PENDING]: '待取车',
  [OrderStatus.IN_USE]: '使用中',
  [OrderStatus.RETURN_PENDING]: '待还车',
  [OrderStatus.SETTLING]: '待结算',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.ABNORMAL]: '异常',
};

/** 允许的状态转移规则（当前状态 → 可转移到的目标状态列表） */
export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PICKUP_PENDING, // 支付成功 → 待取车
    OrderStatus.CANCELLED, // 用户取消
  ],
  [OrderStatus.PICKUP_PENDING]: [
    OrderStatus.IN_USE, // 取车成功
    OrderStatus.CANCELLED, // 取消订单
  ],
  [OrderStatus.IN_USE]: [
    OrderStatus.RETURN_PENDING, // 发起还车
    OrderStatus.ABNORMAL, // 异常上报
  ],
  [OrderStatus.RETURN_PENDING]: [
    OrderStatus.SETTLING, // 还车确认，进入结算
  ],
  [OrderStatus.SETTLING]: [
    OrderStatus.COMPLETED, // 结算完成
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [], // 终态
  [OrderStatus.ABNORMAL]: [
    OrderStatus.SETTLING, // 异常处理完毕进入结算
    OrderStatus.CANCELLED, // 强制取消
  ],
};

/** 检查状态转移是否合法 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
