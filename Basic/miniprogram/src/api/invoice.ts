/**
 * 发票 API
 */
import { get, post, put, del } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { InvoiceTitle, Invoice } from '@/types/extended'

// ==================== 抬头管理 ====================

/** 获取抬头列表 */
export function getInvoiceTitles(): Promise<ApiResponse<InvoiceTitle[]>> {
  return get<InvoiceTitle[]>('/invoice/titles')
}

/** 新增抬头 */
export function createInvoiceTitle(data: {
  type: 'COMPANY' | 'PERSONAL'
  name: string
  taxNo?: string
  phone?: string
  email?: string
  bankName?: string
  bankAccount?: string
  address?: string
}): Promise<ApiResponse<InvoiceTitle>> {
  return post<InvoiceTitle>('/invoice/titles', data)
}

/** 编辑抬头 */
export function updateInvoiceTitle(
  id: number,
  data: Partial<InvoiceTitle>,
): Promise<ApiResponse<void>> {
  return put(`/invoice/titles/${id}`, data)
}

/** 删除抬头 */
export function deleteInvoiceTitle(id: number): Promise<ApiResponse<void>> {
  return del(`/invoice/titles/${id}`)
}

// ==================== 发票申请 ====================

/** 申请开票 */
export function applyInvoice(data: {
  orderId: number
  titleId: number
}): Promise<ApiResponse<Invoice>> {
  return post<Invoice>('/invoices', data)
}

/** 发票列表 */
export function getInvoiceList(params?: {
  page?: number
  size?: number
}): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
  return get<PaginatedResponse<Invoice>>('/invoices', params)
}

/** 发票详情 */
export function getInvoiceDetail(id: number): Promise<ApiResponse<Invoice>> {
  return get<Invoice>(`/invoices/${id}`)
}
