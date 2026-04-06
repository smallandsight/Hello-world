export * from './format'

// ==================== 权限检查 ====================

import { isLoggedIn } from '@/api/request'
import { useUserStore } from '@/stores/user'

/** 检查登录状态，未登录则跳首页 */
export async function checkLogin(): Promise<boolean> {
  if (!isLoggedIn()) {
    uni.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 跳转登录/首页
          console.log('跳转登录')
        }
      },
    })
    return false
  }
  return true
}

/** 检查驾驶证认证状态 */
export async function checkLicenseAuth(): Promise<boolean> {
  try {
    const userStore = useUserStore()
    await userStore.fetchUserInfo()

    if (!userStore.userInfo?.isVerified) {
      uni.showModal({
        title: '需要认证',
        content: '租车需完成驾驶证认证，是否前往认证？',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/user/license' })
          }
        },
      })
      return false
    }
    return true
  } catch {
    return false
  }
}

/** 防抖函数 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

/** 节流函数 */
export function throttle<T extends (...args: any[]) => any>(fn: T, interval = 300): T {
  let lastTime = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn(...args)
    }
  }) as T
}
