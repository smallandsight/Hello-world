import request from './request'

// ---------- 类型定义 ----------
export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  role: string
  storeId?: number
  storeName?: string
}

// ---------- API 接口 ----------
/** 商家员工登录 */
export function loginApi(data: LoginParams): Promise<{ data: LoginResult }> {
  return request({
    url: '/auth/staff/login',
    method: 'POST',
    data,
  })
}

/** 获取当前用户信息 */
export function getUserInfoApi(): Promise<{ data: UserInfo }> {
  return request({
    url: '/auth/staff/me',
    method: 'GET',
  })
}
