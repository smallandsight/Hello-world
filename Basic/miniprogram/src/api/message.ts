import { get, put } from './request'
import type { MessageItem, MessageSummary } from '@/types/coupon'

const BASE = '/message'

/** 获取消息列表 */
export function getMessageList(params?: { type?: string; page?: number; pageSize?: number }) {
  return get<{ list: MessageItem[]; pagination: any }>(`${BASE}/list`, params)
}

/** 消息摘要（首页用） */
export function getMessageSummary() {
  return get<MessageSummary>(`${BASE}/summary`)
}

/** 未读消息数 */
export function getUnreadCount() {
  return get<{ count: number }>(`${BASE}/unread/count`)
}

/** 标记单条已读 */
export function markAsRead(messageId: number | string) {
  return put(`${BASE}/${messageId}/read`, {})
}

/** 标记全部已读 */
export function markAllRead() {
  return put(`${BASE}/all/read`, {})
}
