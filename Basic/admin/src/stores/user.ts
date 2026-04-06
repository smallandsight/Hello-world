import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo } from '@/api/auth'
import { loginApi as staffLogin, getUserInfoApi } from '@/api/auth'
import router from '@/router'

// ---------- Store 定义 ----------
export const useUserStore = defineStore('user', () => {
  // ---------- 状态 ----------
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const userInfo = ref<UserInfo | null>(null)

  // ---------- 计算属性 ----------
  const isLoggedIn = computed(() => !!token.value)
  const nickname = computed(() => userInfo.value?.nickname || userInfo.value?.username || '管理员')
  const avatar = computed(() => userInfo.value?.avatar || '')

  // ---------- Actions ----------

  /** 登录 */
  async function login(username: string, password: string): Promise<boolean> {
    try {
      const res = await staffLogin({ username, password })
      const accessToken = res.data.accessToken

      token.value = accessToken
      localStorage.setItem('admin_token', accessToken)

      // 登录成功后获取用户信息
      await fetchUserInfo()

      return true
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  /** 获取用户信息 */
  async function fetchUserInfo(): Promise<void> {
    try {
      const res = await getUserInfoApi()
      userInfo.value = res.data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // Token 可能已失效，清除登录状态
      logout()
    }
  }

  /** 退出登录 */
  function logout(): void {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    router.push('/login')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    nickname,
    avatar,
    login,
    fetchUserInfo,
    logout,
  }
})
