import request from './request'

/** 车辆列表 */
export function getVehicleList(params?: Record<string, any>) {
  return request({ url: '/vehicles', method: 'get', params })
}

/** 车辆详情 */
export function getVehicleDetail(id: number) {
  return request({ url: `/vehicles/${id}`, method: 'get' })
}

/** 创建车辆 */
export function createVehicle(data: Record<string, any>) {
  return request({ url: '/vehicles', method: 'post', data })
}

/** 更新车辆 */
export function updateVehicle(id: number, data: Record<string, any>) {
  return request({ url: `/vehicles/${id}`, method: 'put', data })
}

/** 上下架车辆 */
export function toggleVehicleStatus(id: number) {
  return request({ url: `/vehicles/${id}/toggle`, method: 'patch' })
}

/** 车型列表 */
export function getModelList(params?: Record<string, any>) {
  return request({ url: '/vehicles/models', method: 'get', params })
}

/** 车辆维护记录 */
export function getMaintenanceRecords(vehicleId: number, params?: Record<string, any>) {
  return request({ url: `/vehicles/${vehicleId}/maintenance`, method: 'get', params })
}
