import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// ---------- 类型定义 ----------
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// ---------- 创建实例 ----------
const service: AxiosInstance = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
})

// ---------- 加载状态管理 ----------
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null

function showLoading() {
  loadingInstance = ElLoading.service({
    lock: true,
    text: '加载中...',
    background: 'rgba(0, 0, 0, 0.3)',
    target: 'body',
  })
}

function hideLoading() {
  if (loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

// ---------- 请求拦截器 ----------
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()

    // 注入 Token
    if (userStore.token && config.headers) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    return config
  },
  (error: AxiosError) => {
    hideLoading()
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// ---------- 响应拦截器 ----------
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data

    // 根据业务 code 判断
    if (res.code !== 0 && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')

      // Token 过期或无效 → 401
      if (res.code === 401 || res.code === 1001) {
        const userStore = useUserStore()
        userStore.logout()
        router.push('/login')
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  (error: AxiosError<ApiResponse>) => {
    hideLoading()

    // HTTP 状态码处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          useUserStore().logout()
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有操作权限')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(
            error.response.data?.message || `请求失败(${error.response.status})`
          )
      }
    } else if (error.message.includes('timeout')) {
      ElMessage.error('请求超时，请稍后重试')
    } else if (!window.navigator.onLine) {
      ElMessage.error('网络连接已断开，请检查网络')
    } else {
      ElMessage.error(error.message || '网络错误')
    }

    return Promise.reject(error)
  }
)

export default service
