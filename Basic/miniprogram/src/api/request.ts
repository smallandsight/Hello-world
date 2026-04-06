/**
 * 统一 API 请求封装
 * - Token 自动注入
 * - 响应拦截（统一错误处理）
 * - 401 自动跳转登录
 */
import type { ApiResponse } from '@/types/common'

// ==================== 配置 ====================

/** 基础 URL — 开发环境 */
const BASE_URL = 'http://localhost:3000'

/** 请求超时时间（毫秒） */
const TIMEOUT = 15000

// ==================== 类型定义 ====================

interface RequestOptions extends UniApp.RequestOptions {
  /** 是否显示加载中提示，默认 true */
  showLoading?: boolean
  /** 加载提示文字 */
  loadingText?: string
  /** 是否在错误时自动弹 toast，默认 true */
  showErrorToast?: boolean
}

// ==================== Token 管理 ====================

const TOKEN_KEY = 'gy_token'

export const getToken = (): string => {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export const setToken = (token: string): void => {
  uni.setStorageSync(TOKEN_KEY, token)
}

export const removeToken = (): void => {
  uni.removeStorageSync(TOKEN_KEY)
}

export const isLoggedIn = (): boolean => {
  return !!getToken()
}

// ==================== 请求核心方法 ====================

/**
 * 发起 HTTP 请求
 */
function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const {
    showLoading = false,
    loadingText = '请求中...',
    showErrorToast = true,
    ...restOptions
  } = options

  // 显示加载状态
  if (showLoading) {
    uni.showLoading({ title: loadingText, mask: true })
  }

  return new Promise((resolve, reject) => {
    const token = getToken()

    // 构建完整配置
    const config: UniApp.RequestOptions = {
      ...restOptions,
      url: `${BASE_URL}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      timeout: TIMEOUT,
      success(response) {
        if (showLoading) {
          uni.hideLoading()
        }
        const res = response as any

        if (res.statusCode === 200) {
          const data: ApiResponse<T> = res.data

          if (data.code === 0 || data.code === undefined) {
            resolve(data)
            return
          }

          // 业务错误
          if (showErrorToast && data.message) {
            uni.showToast({ title: data.message, icon: 'none' })
          }
          reject(data)
        } else if (res.statusCode === 401) {
          // Token 过期或无效
          removeToken()
          if (showErrorToast) {
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          }
          // 延迟跳转登录页
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' })
          }, 1000)
          reject({ code: 401, message: '未授权' })
        } else {
          // 其他 HTTP 错误
          const msg = `网络错误(${res.statusCode})`
          if (showErrorToast) {
            uni.showToast({ title: msg, icon: 'none' })
          }
          reject({ code: res.statusCode, message: msg })
        }
      },
      fail(error) {
        if (showLoading) {
          uni.hideLoading()
        }
        const msg = error.errMsg?.includes('timeout')
          ? '请求超时，请检查网络'
          : error.errMsg?.includes('abort')
          ? '请求已取消'
          : '网络连接失败'

        if (showErrorToast) {
          uni.showToast({ title: msg, icon: 'none' })
        }
        reject(error)
      },
    }

    uni.request(config)
  })
}

// ==================== 快捷方法 ====================

/** GET 请求 */
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  // 将参数拼接到 URL（GET 不支持 body）
  let finalUrl = url
  if (params && Object.keys(params).length > 0) {
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
      .join('&')
    finalUrl = `${url}?${query}`
  }

  return request<T>({
    url: finalUrl,
    method: 'GET',
    ...options,
  })
}

/** POST 请求 */
export function post<T = any>(
  url: string,
  data?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({
    url,
    method: 'POST',
    data,
    ...options,
  })
}

/** PUT 请求 */
export function put<T = any>(
  url: string,
  data?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({
    url,
    method: 'PUT',
    data,
    ...options,
  })
}

/** DELETE 请求 */
export function del<T = any>(
  url: string,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({
    url,
    method: 'DELETE',
    ...options,
  })
}

// ==================== 导出 ====================
export default { get, post, put, del, getToken, setToken, removeToken, isLoggedIn }
