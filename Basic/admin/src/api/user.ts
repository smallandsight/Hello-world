import request from './request'

export function getUserList(params?: Record<string, any>) {
  return request({ url: '/users', method: 'get', params })
}

export function getUserDetail(id: number) {
  return request({ url: `/users/${id}`, method: 'get' })
}

export function updateUserStatus(id: number, status: number, reason?: string) {
  return request({ url: `/users/${id}/status`, method: 'patch', data: { status, reason } })
}

export function getUserOrders(userId: number, params?: Record<string, any>) {
  return request({ url: `/users/${userId}/orders`, method: 'get', params })
}
