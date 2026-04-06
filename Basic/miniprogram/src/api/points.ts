/**
 * 积分 API (Points — 挂在 coupon 模块下)
 */
import { get, post } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { PointsInfo, PointsRecord } from '@/types/extended'

/** 获取积分余额和签到状态 */
export function getPointsBalance(): Promise<ApiResponse<PointsInfo>> {
  return get<PointsInfo>('/points/balance')
}

/** 积分明细 */
export function getPointsRecords(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<PointsRecord>>> {
  return get<PaginatedResponse<PointsRecord>>('/points/records', params)
}

/** 签到 */
export function signIn(): Promise<ApiResponse<{
  pointsEarned: number
  balance: number
  continuousDays: number
}>> {
  return post('/points/sign-in')
}

/** 今日签到状态 */
export function getSignInStatus(): Promise<ApiResponse<{
  todaySigned: boolean
  continuousDays: number
}>> {
  return get('/points/sign-in/status')
}
