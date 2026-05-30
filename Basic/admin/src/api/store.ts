import request from './request'

export function getStoreList(params?: Record<string, any>) {
  return request({ url: '/stores', method: 'get', params })
}

export function getStoreDetail(id: number) {
  return request({ url: `/stores/${id}`, method: 'get' })
}

export function createStore(data: Record<string, any>) {
  return request({ url: '/stores', method: 'post', data })
}

export function updateStore(id: number, data: Record<string, any>) {
  return request({ url: `/stores/${id}`, method: 'put', data })
}

export function getStoreInventory(storeId: number, params?: Record<string, any>) {
  return request({ url: `/stores/${storeId}/inventory`, method: 'get', params })
}

export function updateStoreLocation(id: number, lat: number, lng: number) {
  return request({ url: `/stores/${id}/location`, method: 'patch', data: { lat, lng } })
}
