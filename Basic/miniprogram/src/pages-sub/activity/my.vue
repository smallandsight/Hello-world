<template>
  <view class="my-activity-page">
    <!-- 顶部Tab -->
    <view class="tabs-container">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        {{ tab.name }}
      </view>
    </view>

    <!-- 活动列表 -->
    <scroll-view scroll-y class="activity-scroll">
      <!-- 进行中 -->
      <template v-if="activeTab === 'ongoing'">
        <view
          v-for="item in ongoingList"
          :key="item.id"
          class="activity-card"
          @tap="goDetail(item.activityId)"
        >
          <view class="card-left">
            <view class="discount-badge">
              <text class="discount-value">{{ item.discount }}</text>
              <text class="discount-unit">{{ item.discountUnit }}</text>
            </view>
          </view>
          <view class="card-content">
            <view class="card-title">{{ item.name }}</view>
            <view class="card-info">
              <text class="info-item">{{ item.source }}</text>
              <text class="info-divider">|</text>
              <text class="info-item">有效期至 {{ item.expireDate }}</text>
            </view>
            <view class="card-status">
              <view class="status-tag status-ongoing">{{ item.status }}</view>
            </view>
          </view>
          <view class="card-action">
            <view class="btn-use" @tap.stop="useCoupon(item)">去使用</view>
          </view>
        </view>
      </template>

      <!-- 已使用 -->
      <template v-if="activeTab === 'used'">
        <view
          v-for="item in usedList"
          :key="item.id"
          class="activity-card used"
        >
          <view class="card-left">
            <view class="discount-badge used">
              <text class="discount-value">{{ item.discount }}</text>
              <text class="discount-unit">{{ item.discountUnit }}</text>
            </view>
          </view>
          <view class="card-content">
            <view class="card-title">{{ item.name }}</view>
            <view class="card-info">
              <text class="info-item">使用于 {{ item.usedDate }}</text>
            </view>
            <view class="card-status">
              <view class="status-tag status-used">已使用</view>
            </view>
          </view>
        </view>
      </template>

      <!-- 已过期 -->
      <template v-if="activeTab === 'expired'">
        <view
          v-for="item in expiredList"
          :key="item.id"
          class="activity-card expired"
        >
          <view class="card-left">
            <view class="discount-badge expired">
              <text class="discount-value">{{ item.discount }}</text>
              <text class="discount-unit">{{ item.discountUnit }}</text>
            </view>
          </view>
          <view class="card-content">
            <view class="card-title">{{ item.name }}</view>
            <view class="card-info">
              <text class="info-item">已于 {{ item.expireDate }} 过期</text>
            </view>
            <view class="card-status">
              <view class="status-tag status-expired">已过期</view>
            </view>
          </view>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-if="isEmpty" class="empty-state">
        <image class="empty-image" src="/static/images/empty-coupon.png" mode="aspectFit" />
        <text class="empty-text">暂无活动优惠</text>
        <view class="btn-go-activity" @tap="goActivityList">去看看活动</view>
      </view>
    </scroll-view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <view class="stats-item">
        <text class="stats-label">获得优惠</text>
        <text class="stats-value">{{ stats.total }}</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-label">已使用</text>
        <text class="stats-value">{{ stats.used }}</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item">
        <text class="stats-label">已过期</text>
        <text class="stats-value">{{ stats.expired }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ---------- Tab配置 ----------
const tabs = [
  { key: 'ongoing', name: '进行中' },
  { key: 'used', name: '已使用' },
  { key: 'expired', name: '已过期' },
]
const activeTab = ref('ongoing')

// ---------- 统计数据 ----------
const stats = ref({
  total: 12,
  used: 8,
  expired: 4,
})

// ---------- 活动列表 ----------
interface ActivityCoupon {
  id: string
  activityId: string
  name: string
  discount: string
  discountUnit: string
  source: string
  expireDate: string
  status: string
  usedDate?: string
}

const ongoingList = ref<ActivityCoupon[]>([
  { id: 'C001', activityId: 'A001', name: '限时特价优惠券', discount: '30', discountUnit: '折', source: '清明活动', expireDate: '2026-04-13', status: '未使用' },
  { id: 'C002', activityId: 'A002', name: '新用户立减券', discount: '20', discountUnit: '元', source: '新人礼包', expireDate: '2026-04-30', status: '未使用' },
])

const usedList = ref<ActivityCoupon[]>([
  { id: 'C003', activityId: 'A003', name: '会员专享9折券', discount: '9', discountUnit: '折', source: '会员活动', expireDate: '2026-06-30', status: '已使用', usedDate: '2026-04-05 14:30' },
  { id: 'C004', activityId: 'A001', name: '限时特价优惠券', discount: '30', discountUnit: '折', source: '春节活动', expireDate: '2026-02-15', status: '已使用', usedDate: '2026-02-10 10:20' },
])

const expiredList = ref<ActivityCoupon[]>([
  { id: 'C005', activityId: 'A004', name: '元旦特惠券', discount: '50', discountUnit: '元', source: '元旦活动', expireDate: '2026-01-05', status: '已过期' },
])

const isEmpty = computed(() => {
  if (activeTab.value === 'ongoing') return ongoingList.value.length === 0
  if (activeTab.value === 'used') return usedList.value.length === 0
  if (activeTab.value === 'expired') return expiredList.value.length === 0
  return true
})

// ---------- 方法 ----------
function switchTab(key: string): void {
  activeTab.value = key
}

function goDetail(activityId: string): void {
  uni.navigateTo({ url: `/pages-sub/activity/detail?id=${activityId}` })
}

function useCoupon(item: ActivityCoupon): void {
  console.log('使用优惠券:', item)
  uni.navigateTo({ url: '/pages/car/list' })
}

function goActivityList(): void {
  uni.navigateTo({ url: '/pages-sub/activity/list' })
}
</script>

<style lang="scss" scoped>
.my-activity-page {
  min-height: 100vh;
  background: #f5f5f5;
}

// ========== Tab ==========
.tabs-container {
  display: flex;
  background: #fff;
  padding: 0 30rpx;
}

.tab-item {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #666;
  position: relative;

  &.active {
    color: #1890ff;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 6rpx;
      background: #1890ff;
      border-radius: 3rpx;
    }
  }
}

// ========== 活动列表 ==========
.activity-scroll {
  height: calc(100vh - 88rpx - 100rpx);
  padding: 20rpx;
}

.activity-card {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;

  &.used, &.expired {
    opacity: 0.7;
  }
}

.card-left {
  width: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
}

.discount-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;

  &.used {
    background: transparent;
    color: #52c41a;
  }

  &.expired {
    background: transparent;
    color: #999;
  }
}

.discount-value {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1;
}

.discount-unit {
  font-size: 22rpx;
  margin-top: 4rpx;
}

.card-content {
  flex: 1;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.info-divider {
  color: #ddd;
}

.card-status {
  display: flex;
  align-items: center;
}

.status-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;

  &.status-ongoing {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.status-used {
    background: #f6ffed;
    color: #52c41a;
  }

  &.status-expired {
    background: #f5f5f5;
    color: #999;
  }
}

.card-action {
  display: flex;
  align-items: center;
  padding-right: 24rpx;
}

.btn-use {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
}

// ========== 空状态 ==========
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
  margin-bottom: 30rpx;
}

.btn-go-activity {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
  font-size: 28rpx;
  padding: 20rpx 50rpx;
  border-radius: 40rpx;
}

// ========== 统计信息 ==========
.stats-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
}

.stats-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1890ff;
}

.stats-divider {
  width: 1rpx;
  height: 40rpx;
  background: #eee;
}
</style>