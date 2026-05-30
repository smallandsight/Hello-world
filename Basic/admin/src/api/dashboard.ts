import request from './request'

export function getDashboardOverview() {
  return request({ url: '/dashboard/overview', method: 'get' })
}

export function getOrderStats(params?: Record<string, any>) {
  return request({ url: '/dashboard/order-stats', method: 'get', params })
}

export function getRevenueStats(params?: Record<string, any>) {
  return request({ url: '/dashboard/revenue-stats', method: 'get', params })
}

export function getVehicleUtilization(params?: Record<string, any>) {
  return request({ url: '/dashboard/vehicle-utilization', method: 'get', params })
}

export function getUserGrowth(params?: Record<string, any>) {
  return request({ url: '/dashboard/user-growth', method: 'get', params })
}
