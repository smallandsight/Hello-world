/**
 * 违章押金 API
 */
import { get } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { ViolationDeposit } from '@/types/extended'

/** 查询订单违章押金状态 */
export function getViolationByOrder(
  orderId: number,
): Promise<ApiResponse<ViolationDeposit>> {
  return get<ViolationDeposit>(`/violations/orders/${orderId}`)
}

/** 违章押金列表(用户端) */
export function getViolationList(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<ViolationDeposit>>> {
  return get<PaginatedResponse<ViolationDeposit>>('/violations', params)
}
