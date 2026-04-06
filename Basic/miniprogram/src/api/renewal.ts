/**
 * 续租 API
 */
import { get, post, put } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { Renewal } from '@/types/extended'

/** 发起续租申请 */
export function applyRenewal(data: {
  orderId: number
  newReturnTime: string
  reason?: string
}): Promise<ApiResponse<Renewal>> {
  return post<Renewal>('/renewals', data)
}

/** 我的续租记录 */
export function getMyRenewals(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<Renewal>>> {
  return get<PaginatedResponse<Renewal>>('/renewals/my', params)
}

/** 续租详情 */
export function getRenewalDetail(id: number): Promise<ApiResponse<Renewal>> {
  return get<Renewal>(`/renewals/${id}`)
}

/** 支付续租费用 */
export function payRenewal(
  renewalId: number,
): Promise<ApiResponse<{ paymentNo: string }>> {
  return post(`/renewals/${renewalId}/pay`)
}
