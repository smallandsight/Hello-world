<template>
  <view class="page-user">
    <!-- 用户信息卡片 -->
    <view class="profile-header">
      <view class="avatar-area" @click="goEdit">
        <image class="avatar" :src="userStore.avatarUrl || '/static/images/default-avatar.png'" mode="aspectFill" />
        <text class="edit-icon">✏️</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ userStore.displayName }}</text>
        <view class="member-badge" v-if="userStore.memberLevelName">
          <text class="badge-text">{{ userStore.memberLevelName }}</text>
        </view>
      </view>
      <!-- 未读消息 -->
      <view class="msg-entry" @click="goMessages">
        <text class="msg-icon">🔔</text>
        <view class="dot" v-if="userStore.unreadMessageCount > 0">
          <text>{{ userStore.unreadMessageCount > 99 ? '99+' : userStore.unreadMessageCount }}</text>
        </view>
      </view>
    </view>

    <!-- 统计数据 -->
    <view class="stats-row">
      <view class="stat-item" @click="goOrders">
        <text class="stat-num">--</text><text class="stat-label">订单</text>
      </view>
      <view class="stat-item" @click="goCoupons">
        <text class="stat-num">--</text><text class="stat-label">优惠券</text>
      </view>
      <view class="stat-item" @click="goPoints">
        <text class="stat-num">--</text><text class="stat-label">积分</text>
      </view>
      <view class="stat-item" @click="goFavorites">
        <text class="stat-num">--</text><text class="stat-label">收藏</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-group">
        <view v-for="(item, idx) in mainMenus" :key="idx" class="menu-item" @click="onMenuTap(item)">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-label">{{ item.label }}</text>
          <text class="menu-arrow">></text>
          <view class="badge" v-if="item.badge"><text>{{ item.badge }}</text></view>
        </view>
      </view>

      <!-- 设置组 -->
      <view class="menu-group mt-20">
        <view v-for="(item, idx) in settingMenus" :key="'s' + idx" class="menu-item" @click="onMenuTap(item)">
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-label">{{ item.label }}</text>
          <text class="menu-arrow">></text>
        </view>
      </view>
    </view>

    <!-- 版本号 -->
    <view class="version">v1.0.0</view>
  </view>
</template>

<script setup lang="ts'>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const mainMenus = [
  { icon: '🎫', label: '我的优惠券', path: '/pages/user/coupon', badge: '' },
  { icon: '💰', label: '我的钱包', path: '/pages/user/wallet', badge: '' },
  { icon: '⭐', label: '我的收藏', path: '/pages/user/favorite', badge: '' },
  { icon: '📋', label: '驾驶证认证', path: '/pages/user/license', badge: userStore.hasLicense ? '已认证' : '未认证' },
]

const settingMenus = [
  { icon: '📢', label: '消息中心', path: '/pages/message/list' },
  { icon: '⚙️', label: '设置', path: '/pages/settings/index' },
  { icon: 'ℹ️', label: '关于我们', path: '' },
]

// ==================== 生命周期 ====================

onMounted(() => {
  userStore.initUser()
})

onShow(() => {
  // 每次显示时刷新用户数据
})

// ==================== 导航方法 ====================

function goEdit() { uni.navigateTo({ url: '/pages/user/edit' }) }
function goMessages() { uni.navigateTo({ url: '/pages/message/list' }) }
function goOrders() { uni.switchTab({ url: '/pages/order/list' }) }
function goCoupons() { uni.navigateTo({ url: '/pages/user/coupon' }) }
function goPoints() { uni.showToast({ title: '积分功能开发中', icon: 'none' }) }
function goFavorites() { uni.navigateTo({ url: '/pages/user/favorite' }) }

function onMenuTap(item: any) {
  if (item.path) {
    if (item.path.includes('license') && !userStore.isLoggedIn) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    uni.navigateTo({ url: item.path })
  } else if (item.label === '关于我们') {
    uni.showModal({
      title: '古月租车',
      content: '版本：v1.0.0\n光阳电助力自行车租赁平台',
      showCancel: false,
    })
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.page-user { min-height: 100vh; background: var(--bg-secondary); padding-bottom: 40rpx; }

/* 头部 */
.profile-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  padding: 60rpx 32rpx 48rpx;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;

  .avatar-area {
    position: relative;

    .avatar {
      width: 120rpx; height: 120rpx;
      border-radius: 50%; border: 4rpx solid rgba(255,255,255,0.3);
    }
    .edit-icon {
      position: absolute; bottom: 0; right: -6rpx;
      font-size: 28rpx; background: var(--bg-primary);
      width: 40rpx; height: 40rpx; line-height: 38rpx;
      text-align: center; border-radius: 50%; font-size: 22rpx;
    }
  }

  .user-info {
    flex: 1;

    .nickname { font-size: 36rpx; font-weight: bold; color: #fff; display: block; }
    .member-badge { margin-top: 8rpx;
      .badge-tag { display: inline-block; padding: 2rpx 16rpx; background: rgba(255,215,0,0.25); color: #ffd666; font-size: 22rpx; border-radius: 12rpx; }
    }
  }

  .msg-entry {
    position: relative; padding: 10rpx;

    .msg-icon { font-size: 40rpx; }
    .dot {
      position: absolute; top: 4rpx; right: 0;
      background: #f5222d; min-width: 30rpx; height: 30rpx;
      border-radius: 15rpx; display: flex; align-items: center; justify-content: center;

      text { font-size: 18rpx; color: #fff; padding: 0 8rpx; }
    }
  }
}

/* 统计 */
.stats-row {
  display: flex; justify-content: space-around;
  margin: 24rpx; background: var(--bg-primary); border-radius: 16rpx; padding: 28rpx 16rpx;

  .stat-item {
    display: flex; flex-direction: column; align-items: center; gap: 6rpx;

    .stat-num { font-size: 34rpx; font-weight: bold; color: var(--primary-color); }
    .stat-label { font-size: 22rpx; color: var(--text-tertiary); }
  }
}

/* 菜单 */
.menu-section { padding: 0 24rpx; }

.menu-group {
  background: var(--bg-primary); border-radius: 16rpx; overflow: hidden;

  &.mt-20 { margin-top: 20rpx; }
}

.menu-item {
  display: flex; align-items: center; padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--border-light);

  &:last-child { border-bottom: none; }

  &:active { background: #fafafa; }

  .menu-icon { font-size: 36rpx; margin-right: 20rpx; width: 44rpx; text-align: center; }
  .menu-label { flex: 1; font-size: 30rpx; color: var(--text-primary); }
  .menu-arrow { font-size: 26rpx; color: var(--text-tertiary); }

  .badge {
    margin-right: 12rpx; padding: 2rpx 14rpx; background: #f5222d; border-radius: 12rpx;
    text { font-size: 18rpx; color: #fff; }
  }
}

.version {
  text-align: center; font-size: 22rpx; color: #bbb; margin-top: 60rpx;
}
</style>
