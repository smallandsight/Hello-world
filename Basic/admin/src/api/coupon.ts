import request from './request'

export function getCouponList(params?: Record<string, any>) {
  return request({ url: '/coupons/admin', method: 'get', params })
}

export function getCouponDetail(id: number) {
  return request({ url: `/coupons/admin/${id}`, method: 'get' })
}

export function createCoupon(data: Record<string, any>) {
  return request({ url: '/coupons/admin', method: 'post', data })
}

export function updateCoupon(id: number, data: Record<string, any>) {
  return request({ url: `/coupons/admin/${id}`, method: 'put', data })
}

export function toggleCouponStatus(id: number) {
  return request({ url: `/coupons/admin/${id}/toggle`, method: 'patch' })
}

export function getPointsRecords(params?: Record<string, any>) {
  return request({ url: '/points/records', method: 'get', params })
}

export function manualAdjustPoints(userId: number, points: number, remark?: string) {
  return request({ url: '/points/adjust', method: 'post', data: { userId, points, remark } })
}
