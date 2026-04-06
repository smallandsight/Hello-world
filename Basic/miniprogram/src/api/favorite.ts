/**
 * 收藏 API
 */
import { get, post, del } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'

/** 收藏车辆（幂等） */
export function addFavorite(vehicleId: number): Promise<ApiResponse<void>> {
  return post('/favorites', { vehicleId })
}

/** 取消收藏 */
export function removeFavorite(vehicleId: number): Promise<ApiResponse<void>> {
  return del(`/favorites/${vehicleId}`)
}

/** 我的收藏列表 */
export function getFavorites(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<any>>> {
  return get('/favorites', params)
}

/** 检查是否已收藏 */
export function checkFavorited(
  vehicleId: number,
): Promise<ApiResponse<{ favorited: boolean }>> {
  return get(`/favorites/check/${vehicleId}`)
}
