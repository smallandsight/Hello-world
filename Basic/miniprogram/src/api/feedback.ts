/**
 * 反馈 API
 */
import { get, post } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { Feedback } from '@/types/extended'

/** 提交反馈 */
export function createFeedback(data: {
  category: string
  content: string
  images?: string[]
  contact?: string
}): Promise<ApiResponse<Feedback>> {
  return post<Feedback>('/feedbacks', data)
}

/** 我的反馈记录 */
export function getMyFeedbacks(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<Feedback>>> {
  return get<PaginatedResponse<Feedback>>('/feedbacks/my', params)
}

/** 反馈详情 */
export function getFeedbackDetail(id: number): Promise<ApiResponse<Feedback>> {
  return get<Feedback>(`/feedbacks/${id}`)
}
