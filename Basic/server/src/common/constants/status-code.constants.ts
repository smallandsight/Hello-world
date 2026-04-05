/**
 * HTTP 状态码与业务错误码的映射关系
 */
export const HTTP_STATUS_MAP: Record<number, { httpStatus: number; message: string }> = {
  // 通用错误
  1001: { httpStatus: 500, message: '服务器内部错误' },
  1002: { httpStatus: 400, message: '参数校验失败' },
  1003: { httpStatus: 401, message: '未登录或登录已过期' },
  1004: { httpStatus: 403, message: '无权访问此资源' },
  1005: { httpStatus: 404, message: '请求的资源不存在' },
  1006: { httpStatus: 405, message: '请求方法不允许' },
  1007: { httpStatus: 429, message: '请求过于频繁，请稍后再试' },

  // 用户
  2001: { httpStatus: 404, message: '用户不存在' },
  2002: { httpStatus: 409, message: '用户已存在' },
  2003: { httpStatus: 403, message: '账号已被禁用' },
  2004: { httpStatus: 409, message: '手机号已被绑定' },

  // 车辆
  3001: { httpStatus: 404, message: '车辆不存在' },
  3002: { httpStatus: 400, message: '该车辆当前不可用' },
  3003: { httpStatus: 404, message: '门店不存在' },

  // 订单
  4001: { httpStatus: 404, message: '订单不存在' },
  4002: { httpStatus: 400, message: '订单状态异常，无法执行此操作' },
  4003: { httpStatus: 400, message: '当前状态无法取消订单' },

  // 支付
  5001: { httpStatus: 404, message: '支付记录不存在' },
  5002: { httpStatus: 400, message: '支付失败，请重试' },
  5003: { httpStatus: 500, message: '退款处理失败' },

  // 营销
  6001: { httpStatus: 404, message: '优惠券不存在' },
  6002: { httpStatus: 400, message: '优惠券已过期' },
  6003: { httpStatus: 400, message: '优惠券已使用' },

  // 客服
  7001: { httpStatus: 404, message: '工单不存在' },
  7002: { httpStatus: 400, message: '工单已关闭' },

  // 系统
  9001: { httpStatus: 503, message: '系统繁忙，请稍后重试' },
};

/**
 * 根据错误码获取对应的 HTTP 状态码
 */
export function getHttpStatusCode(errorCode: number): number {
  return (
    HTTP_STATUS_MAP[errorCode]?.httpStatus ||
    (errorCode >= 9000 ? 503 : 500)
  );
}

/**
 * 根据错误码获取默认消息
 */
export function getErrorMessage(errorCode: number): string {
  return HTTP_STATUS_MAP[errorCode]?.message || '未知错误';
}
