/**
 * 工单 API
 */
import { get, post } from './request'
import type { ApiResponse, PaginatedResponse } from '@/types/common'
import type { Ticket, TicketReply } from '@/types/extended'

/** 提交工单 */
export function createTicket(data: {
  category: string
  title: string
  content: string
  images?: string[]
  orderId?: number
}): Promise<ApiResponse<Ticket>> {
  return post<Ticket>('/tickets', data)
}

/** 我的工单列表 */
export function getMyTickets(params?: {
  page?: number
  size?: number
  status?: string
  category?: string
}): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
  return get<PaginatedResponse<Ticket>>('/tickets/my', params)
}

/** 工单详情(含回复) */
export function getTicketDetail(id: number): Promise<
  ApiResponse<Ticket & { replies: TicketReply[] }>
> {
  return get<Ticket & { replies: TicketReply[] }>(`/tickets/${id}`)
}

/** 追加回复 */
export function addTicketReply(ticketId: number, data: {
  content: string
  images?: string[]
}): Promise<ApiResponse<TicketReply>> {
  return post<TicketReply>(`/tickets/${ticketId}/reply`, data)
}
