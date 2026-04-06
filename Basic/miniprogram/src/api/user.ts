import { get, post, put } from './request'
import type {
  UserInfo,
  LoginResult,
  MemberInfo,
  WalletInfo,
} from '@/types/user'

const BASE = '/user'

// ========== 认证相关 ==========

/** 支付宝/微信小程序登录 */
export function alipayLogin(params: { authCode: string }) {
  return post<{ token: string; refreshToken: string; isNewUser: boolean; userInfo: UserInfo }>(
    '/auth/alipay/login',
    params,
    { showLoading: true, loadingText: '登录中...' },
  )
}

/** 刷新 Token */
export function refreshToken(refreshToken: string) {
  return post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken })
}

/** 登出 */
export function logout() {
  return post('/auth/logout', {})
}

// ========== 用户信息 ==========

/** 获取当前用户信息 */
export function getUserInfo() {
  return get<UserInfo>(`${BASE}/info`)
}

/** 更新用户信息 */
export function updateUserInfo(data: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl' | 'gender' | 'birthday'>>) {
  return put(`${BASE}/info`, data, { showLoading: true })
}

// ========== 会员相关 ==========

/** 获取会员信息 */
export function getMemberInfo() {
  return get<MemberInfo>(`${BASE}/member/info`)
}

/** 更新会员昵称等 */
export function updateMemberInfo(data: Partial<MemberInfo>) {
  return put(`${BASE}/member/info`, data, { showLoading: true })
}

// ========== 钱包 ==========

/** 获取钱包信息（余额 + 流水） */
export function getWalletInfo() {
  return get<WalletInfo>(`${BASE}/wallet`)
}

// ========== 收藏 ==========

/** 获取收藏列表 */
export function getFavorites() {
  return get(`${BASE}/favorites`)

/** 切换收藏状态 */
export function toggleFavorite(vehicleId: number) {
  return post(`${BASE}/favorite/toggle`, { vehicleId })
}

// ========== 骑行统计 ==========

/** 获取骑行统计数据 */
export function getRideStats() {
  return get<{
    totalOrders: number
    totalDays: number
    totalAmount: number
    avgAmountPerOrder: number
  }>(`${BASE}/ride-stats`)
}
