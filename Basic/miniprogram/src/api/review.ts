/**
 * 评价 API
 */
import { get, post, put } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { Review, ReviewSummary } from '@/types/extended'

/** 提交评价 */
export function createReview(data: {
  orderId: number
  vehicleId: number
  rating: number
  content?: string
  images?: string[]
  tags?: string[]
}): Promise<ApiResponse<Review>> {
  return post<Review>('/reviews', data)
}

/** 车辆评价列表 */
export function getVehicleReviews(vehicleId: number, params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<Review>>> {
  return get<PaginatedResponse<Review>>(`/reviews/vehicle/${vehicleId}`, params)
}

/** 车辆评分汇总 */
export function getVehicleReviewSummary(
  vehicleId: number,
): Promise<ApiResponse<ReviewSummary>> {
  return get<ReviewSummary>(`/reviews/vehicle/${vehicleId}/summary`)
}

/** 我的评价列表 */
export function getMyReviews(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<Review>>> {
  return get<PaginatedResponse<Review>>('/reviews/my', params)
}
