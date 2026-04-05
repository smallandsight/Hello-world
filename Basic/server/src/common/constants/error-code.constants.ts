/**
 * 错误码枚举定义
 * 遵循接口文档规范：0=成功, 1xxx=通用, 2xxx=用户, 3xxx=车辆,
 * 4xxx=订单, 5xxx=支付, 6xxx=营销, 7xxx=客服, 9xxx=系统
 */
export enum ErrorCode {
  // ========== 成功 ==========
  SUCCESS = 0,

  // ========== 1000-1999 通用错误 ==========
  SERVER_INTERNAL_ERROR = 1001,
  INVALID_PARAMS = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,
  NOT_FOUND = 1005,
  METHOD_NOT_ALLOWED = 1006,
  TOO_MANY_REQUESTS = 1007,

  // ========== 2000-2999 用户模块 ==========
  USER_NOT_FOUND = 2001,
  USER_ALREADY_EXISTS = 2002,
  USER_DISABLED = 2003,
  PHONE_ALREADY_BIND = 2004,
  LICENSE_EXPIRED = 2005,
  LICENSE_AUDIT_PENDING = 2006,
  REAL_NAME_REQUIRED = 2007,

  // ========== 3000-3999 车辆模块 ==========
  VEHICLE_NOT_FOUND = 3001,
  VEHICLE_UNAVAILABLE = 3002,
  STORE_NOT_FOUND = 3003,
  VEHICLE_MODEL_NOT_FOUND = 3004,

  // ========== 4000-4999 订单模块 ==========
  ORDER_NOT_FOUND = 4001,
  ORDER_STATUS_INVALID = 4002,
  ORDER_CANNOT_CANCEL = 4003,
  VEHICLE_IN_USE = 4004,
  DEPOSIT_INSUFFICIENT = 4005,

  // ========== 5000-5999 支付模块 ==========
  PAYMENT_NOT_FOUND = 5001,
  PAYMENT_FAILED = 5002,
  REFUND_FAILED = 5003,
  PREAUTH_FAILED = 5004,
  PAYMENT_TIMEOUT = 5005,

  // ========== 6000-6999 营销模块 ==========
  COUPON_NOT_FOUND = 6001,
  COUPON_EXPIRED = 6002,
  COUPON_USED = 6003,
  COUPON_NOT_APPLICABLE = 6004,
  POINTS_INSUFFICIENT = 6005,

  // ========== 7000-7999 客服工单 ==========
  TICKET_NOT_FOUND = 7001,
  TICKET_CLOSED = 7002,
  REPLY_NOT_ALLOWED = 7003,

  // ========== 9000-9999 系统错误 ==========
  SYSTEM_BUSY = 9001,
  CONFIG_ERROR = 9002,
  THIRD_PARTY_ERROR = 9003,
}

/** 错误码对应的消息映射表 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',

  // 通用
  [ErrorCode.SERVER_INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.INVALID_PARAMS]: '参数校验失败',
  [ErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ErrorCode.FORBIDDEN]: '无权访问此资源',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.METHOD_NOT_ALLOWED]: '请求方法不允许',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',

  // 用户
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USER_DISABLED]: '账号已被禁用',
  [ErrorCode.PHONE_ALREADY_BIND]: '手机号已被绑定',
  [ErrorCode.LICENSE_EXPIRED]: '驾驶证已过期',
  [ErrorCode.LICENSE_AUDIT_PENDING]: '驾驶证正在审核中，请耐心等待',
  [ErrorCode.REAL_NAME_REQUIRED]: '请先完成实名认证',

  // 车辆
  [ErrorCode.VEHICLE_NOT_FOUND]: '车辆不存在',
  [ErrorCode.VEHICLE_UNAVAILABLE]: '该车辆当前不可用',
  [ErrorCode.STORE_NOT_FOUND]: '门店不存在',
  [ErrorCode.VEHICLE_MODEL_NOT_FOUND]: '车型不存在',

  // 订单
  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_INVALID]: '订单状态异常，无法执行此操作',
  [ErrorCode.ORDER_CANNOT_CANCEL]: '当前状态无法取消订单',
  [ErrorCode.VEHICLE_IN_USE]: '该车辆已被占用',
  [ErrorCode.DEPOSIT_INSUFFICIENT]: '押金余额不足',

  // 支付
  [ErrorCode.PAYMENT_NOT_FOUND]: '支付记录不存在',
  [ErrorCode.PAYMENT_FAILED]: '支付失败，请重试',
  [ErrorCode.REFUND_FAILED]: '退款处理失败',
  [ErrorCode.PREAUTH_FAILED]: '预授权操作失败',
  [ErrorCode.PAYMENT_TIMEOUT]: '支付超时，请检查后重试',

  // 营销
  [ErrorCode.COUPON_NOT_FOUND]: '优惠券不存在',
  [ErrorCode.COUPON_EXPIRED]: '优惠券已过期',
  [ErrorCode.COUPON_USED]: '优惠券已使用',
  [ErrorCode.COUPON_NOT_APPLICABLE]: '该优惠券不适用于此订单',
  [ErrorCode.POINTS_INSUFFICIENT]: '积分余额不足',

  // 客服
  [ErrorCode.TICKET_NOT_FOUND]: '工单不存在',
  [ErrorCode.TICKET_CLOSED]: '工单已关闭',
  [ErrorCode.REPLY_NOT_ALLOWED]: '无法回复此工单',

  // 系统
  [ErrorCode.SYSTEM_BUSY]: '系统繁忙，请稍后重试',
  [ErrorCode.CONFIG_ERROR]: '系统配置错误',
  [ErrorCode.THIRD_PARTY_ERROR]: '第三方服务调用失败',
};
