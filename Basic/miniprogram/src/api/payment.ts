import { post, get } from './request'

const BASE = '/payment'

/**
 * 创建微信支付 — 返回支付参数供小程序调用 wx.requestPayment
 */
export function createWxPayment(orderId: number | string) {
  return post<{
    orderId: number
    tradeNo: string
    payParams: {
      timeStamp: string
      nonceStr: string
      package: string
      signType: string
      paySign: string
    }
  }>(`${BASE}/pay/${orderId}`, {}, { showLoading: true, loadingText: '正在发起支付...' })
}

/** 查询支付状态 */
export function getPaymentStatus(orderId: number | string) {
  return get<{
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    paidAt?: string
    tradeNo?: string
  }>(`${BASE}/${orderId}/status`)
}

/** 申请退款 */
export function requestRefund(orderId: number | string, reason?: string) {
  return post(`${BASE}/${orderId}/refund`, { reason }, { showLoading: true, loadingText: '退款申请中...' })
}
