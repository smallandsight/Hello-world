import { get } from './request'
import type { Vehicle, VehicleListItem, Store, VehicleModel } from '@/types/vehicle'

const BASE = '/vehicle'

// ========== 车辆相关 ==========

/** 获取附近/推荐车辆列表 */
export function getNearbyVehicles(params?: {
  latitude?: number
  longitude?: number
  radius?: number
  page?: number
  pageSize?: number
  recommend?: boolean
}) {
  return get<{ list: VehicleListItem[]; pagination: any }>(`${BASE}/list`, params)
}

/** 获取车辆详情 */
export function getVehicleDetail(vehicleId: number | string) {
  return get<Vehicle>(`${BASE}/${vehicleId}/detail`, undefined, { showLoading: true })
}

/** 获取车型列表 */
export function getModelList() {
  return get<VehicleModel[]>(`${BASE}/model/list`)
}

// ========== 门店相关 ==========

/** 获取门店列表 */
export function getStoreList(params?: { city?: string; page?: number; pageSize?: number }) {
  return get<{ list: Store[]; pagination: any }>('/store/list', params)
}

/** 获取门店详情 */
export function getStoreDetail(storeId: number | string) {
  return get<Store>(`/store/${storeId}`)
}
