import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, removeToken, isLoggedIn as checkIsLoggedIn } from '@/api/request'
import * as userApi from '@/api/user'
import type { UserInfo, MemberInfo, WalletInfo } from '@/types/user'

/** 用户状态管理 */
export const useUserStore = defineStore('user', () => {
  // ==================== State ====================

  /** 用户信息 */
  const userInfo = ref<UserInfo | null>(null)
  /** 会员信息 */
  const memberInfo = ref<MemberInfo | null>(null)
  /** 钱包信息 */
  const walletInfo = ref<WalletInfo | null>(null)

  // ==================== Getters ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => checkIsLoggedIn() && !!userInfo.value)

  /** 用户昵称（有值返回昵称，否则显示"用户"） */
  const displayName = computed(() => {
    return userInfo.value?.nickname || userInfo.value?.phone || '用户'
  })

  /** 头像地址 */
  const avatarUrl = computed(() => {
    return userInfo.value?.avatarUrl || '/static/images/default-avatar.png'
  })

  /** 会员等级名称 */
  const memberLevelName = computed(() => {
    return memberInfo?.value?.levelName || '普通会员'
  })

  /** 是否已认证驾驶证 */
  const hasLicense = computed(() => {
    return userInfo.value?.isVerified ?? false
  })

  /** 芝麻信用分是否可免押（>=650） */
  const canCreditFreeDeposit = computed(() => {
    return (userInfo.value?.creditScore ?? 0) >= 650
  })

  /** 未读消息数（从其他模块更新） */
  const unreadMessageCount = ref(0)

  // ==================== Actions ====================

  /**
   * 登录
   */
  async function login(authCode: string) {
    const res = await userApi.alipayLogin({ authCode })
    if (res.data.token) {
      setToken(res.data.token)
    }
    if (res.data.userInfo) {
      userInfo.value = res.data.userInfo
    }
    return res.data
  }

  /**
   * 获取用户信息
   */
  async function fetchUserInfo() {
    try {
      const res = await userApi.getUserInfo()
      userInfo.value = res.data
      return res.data
    } catch (err) {
      console.error('获取用户信息失败:', err)
      throw err
    }
  }

  /**
   * 获取会员信息
   */
  async function fetchMemberInfo() {
    try {
      const res = await userApi.getMemberInfo()
      memberInfo.value = res.data
      return res.data
    } catch (err) {
      console.error('获取会员信息失败:', err)
      throw err
    }
  }

  /**
   * 获取钱包信息
   */
  async function fetchWalletInfo() {
    try {
      const res = await userApi.getWalletInfo()
      walletInfo.value = res.data
      return res.data
    } catch (err) {
      console.error('获取钱包信息失败:', err)
      throw err
    }
  }

  /**
   * 更新用户信息
   */
  async function updateProfile(data: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl'>>) {
    await userApi.updateUserInfo(data)
    // 刷新本地数据
    if (userInfo.value) {
      Object.assign(userInfo.value, data)
    }
  }

  /**
   * 登出
   */
  function logout() {
    removeToken()
    userInfo.value = null
    memberInfo.value = null
    walletInfo.value = null
  }

  /**
   * 初始化 — App 启动时调用，恢复用户信息
   */
  async function initUser() {
    if (!checkIsLoggedIn()) return

    try {
      await Promise.all([fetchUserInfo(), fetchMemberInfo()])
    } catch {
      // Token 可能已失效，静默处理
      logout()
    }
  }

  return {
    // State
    userInfo,
    memberInfo,
    walletInfo,
    unreadMessageCount,

    // Getters
    isLoggedIn,
    displayName,
    avatarUrl,
    memberLevelName,
    hasLicense,
    canCreditFreeDeposit,

    // Actions
    login,
    fetchUserInfo,
    fetchMemberInfo,
    fetchWalletInfo,
    updateProfile,
    logout,
    initUser,
  }
})
