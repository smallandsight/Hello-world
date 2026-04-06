/**
 * 钱包 API
 */
import { get, post } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { WalletInfo, WalletTransaction } from '@/types/extended'

/** 获取钱包信息（余额/冻结额） */
export function getWalletInfo(): Promise<ApiResponse<WalletInfo>> {
  return get<WalletInfo>('/wallet')
}

/** 获取交易流水 */
export function getWalletTransactions(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<WalletTransaction>>> {
  return get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', params)
}

/** 充值(创建支付订单) */
export function rechargeWallet(data: {
  amountCents: number
}): Promise<ApiResponse<{ paymentNo: string }>> {
  return post('/wallet/recharge', data)
}
