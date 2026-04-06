import { get, post } from './request'
import type { UserCoupon, PointsInfo } from '@/types/coupon'

const BASE = '/coupon'

// ========== 优惠券 ==========

/** 我的优惠券列表 */
export function getUserCoupons(status?: string, page = 1, pageSize = 20) {
  return get<{ list: UserCoupon[]; pagination: any }>(
    `${BASE}/my/list`,
    { status, page, pageSize },
  )
}

/** 获取某订单可用的优惠券 */
export function getAvailableForOrder(orderId: number | string) {
  return get<UserCoupon[]>(`${BASE}/available/${orderId}`)
}

/** 领取优惠券 */
export function claimCoupon(couponId: number | string, channel: string) {
  return post(`${BASE}/claim/${couponId}`, { channel }, { showLoading: true })
}

// ========== 积分 ==========

/** 获取积分余额 + 明细 */
export function getPointsInfo() {
  return get<PointsInfo>(`${BASE}/points/balance`)
}

/** 积分历史 */
export function getPointsHistory(page = 1, pageSize = 20) {
  return get(`${BASE}/points/history`, { page, pageSize })
}
