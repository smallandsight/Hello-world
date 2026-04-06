import { get, post, put } from './request'
import type {
  Order,
  OrderListItem,
  FeeDetail,
  CreateOrderParams,
} from '@/types/order'

const BASE = '/order'

// ========== 订单创建 ==========

/** 创建订单 */
export function createOrder(params: CreateOrderParams) {
  return post<Order>(BASE, params, { showLoading: true, loadingText: '提交中...' })
}

/** 预览价格（不创建订单） */
export function previewSettlement(params: {
  vehicleId: number
  startTime: string
  endTime: string
  insuranceType?: string
  userCouponId?: number
}) {
  return post<FeeDetail>(`${BASE}/price/preview`, params)
}

// ========== 订单查询 ==========

/** 获取订单列表（分页） */
export function getOrderList(params?: { status?: string; page?: number; pageSize?: number }) {
  return get<{ list: OrderListItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
    BASE,
    params,
  )
}

/** 获取订单详情 */
export function getOrderDetail(orderId: number | string) {
  return get<Order>(`${BASE}/${orderId}`, undefined, { showLoading: true })
}

// ========== 订单操作 ==========

/** 取消订单 */
export function cancelOrder(orderId: number | string, reason?: string) {
  return put(`${Base}/${orderId}/cancel`, { reason }, { showLoading: true })
}

/** 取车确认 */
export function pickupVehicle(orderId: number | string, params?: { mileage?: number; fuelLevel?: number }) {
  return post(`${BASE}/${orderId}/pickup`, params, { showLoading: true, loadingText: '确认取车...' })
}

/** 还车结算 */
export function returnVehicle(orderId: number | string, params?: { mileage?: number; fuelLevel?: number }) {
  return post(`${BASE}/${orderId}/return`, params, { showLoading: true, loadingText: '还车中...' })
}

/** 确认还车（最终结算） */
export function confirmReturn(orderId: number | string, params?: { actualEndTime?: string }) {
  return post(`${BASE}/${orderId}/confirm-return`, params, { showLoading: true, loadingText: '结算中...' })
}
