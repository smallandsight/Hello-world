import request from './request'

export function getOrderList(params?: Record<string, any>) {
  return request({ url: '/orders', method: 'get', params })
}

export function getOrderDetail(id: number) {
  return request({ url: `/orders/${id}`, method: 'get' })
}

export function confirmPickup(id: number, data: Record<string, any>) {
  return request({ url: `/orders/${id}/pickup`, method: 'post', data })
}

export function confirmReturn(id: number, data: Record<string, any>) {
  return request({ url: `/orders/${id}/return`, method: 'post', data })
}

export function cancelOrder(id: number, reason?: string) {
  return request({ url: `/orders/${id}/cancel`, method: 'post', data: { reason } })
}

export function exportOrders(params?: Record<string, any>) {
  return request({ url: '/orders/export', method: 'get', params, responseType: 'blob' })
}
