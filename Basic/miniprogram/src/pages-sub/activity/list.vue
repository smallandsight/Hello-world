<template>
  <view class="activity-list-page">
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
        <view v-if="activeTab === tab.key" class="tab-indicator"></view>
      </view>
    </view>

    <!-- 活动列表 -->
    <scroll-view
      scroll-y
      class="activity-scroll"
      @scrolltolower="loadMore"
    >
      <!-- 进行中活动 -->
      <template v-if="activeTab === 'ongoing'">
        <view
          v-for="activity in ongoingList"
          :key="activity.id"
          class="activity-card"
          @tap="goDetail(activity.id)"
        >
          <image class="activity-cover" :src="activity.cover" mode="aspectFill" />
          <view class="activity-info">
            <view class="activity-header">
              <text class="activity-title">{{ activity.name }}</text>
              <view class="activity-tag" :class="`tag-${activity.type}`">
                {{ getTypeName(activity.type) }}
              </view>
            </view>
            <view class="activity-desc">{{ activity.description }}</view>
            <view class="activity-footer">
              <view class="activity-time">
                <text class="iconfont icon-clock"></text>
                <text>{{ activity.startTime }} - {{ activity.endTime }}</text>
              </view>
              <view class="activity-stats">
                <text>{{ activity.participantCount }}人参与</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 即将开始 -->
      <template v-if="activeTab === 'upcoming'">
        <view
          v-for="activity in upcomingList"
          :key="activity.id"
          class="activity-card upcoming"
          @tap="goDetail(activity.id)"
        >
          <view class="upcoming-badge">即将开始</view>
          <image class="activity-cover" :src="activity.cover" mode="aspectFill" />
          <view class="activity-info">
            <view class="activity-header">
              <text class="activity-title">{{ activity.name }}</text>
              <view class="activity-tag" :class="`tag-${activity.type}`">
                {{ getTypeName(activity.type) }}
              </view>
            </view>
            <view class="activity-desc">{{ activity.description }}</view>
            <view class="activity-footer">
              <view class="countdown">
                <text>距离开始还剩</text>
                <text class="countdown-time">{{ activity.countdown }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 已结束 -->
      <template v-if="activeTab === 'ended'">
        <view
          v-for="activity in endedList"
          :key="activity.id"
          class="activity-card ended"
        >
          <view class="ended-mask">已结束</view>
          <image class="activity-cover" :src="activity.cover" mode="aspectFill" />
          <view class="activity-info">
            <view class="activity-header">
              <text class="activity-title">{{ activity.name }}</text>
            </view>
            <view class="activity-desc">{{ activity.description }}</view>
            <view class="activity-footer">
              <text class="ended-text">{{ activity.participantCount }}人参与</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-if="noMore" class="no-more-tip">
        <text>没有更多了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="isEmpty" class="empty-state">
        <image class="empty-image" src="/static/images/empty-activity.png" mode="aspectFit" />
        <text class="empty-text">暂无活动</text>
      </view>
    </scroll-view>

    <!-- 我的活动入口 -->
    <view class="my-activity-entry" @tap="goMyActivity">
      <text class="iconfont icon-gift"></text>
      <text class="entry-text">我的活动</text>
      <text class="iconfont icon-arrow-right"></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// ---------- Tab配置 ----------
const tabs = [
  { key: 'ongoing', name: '进行中' },
  { key: 'upcoming', name: '即将开始' },
  { key: 'ended', name: '已结束' },
]
const activeTab = ref('ongoing')

// ---------- 活动列表 ----------
interface ActivityItem {
  id: string
  name: string
  type: string
  cover: string
  description: string
  startTime: string
  endTime: string
  participantCount: number
  countdown?: string
}

const ongoingList = ref<ActivityItem[]>([
  { id: 'A001', name: '清明小长假限时特价', type: 'flash_sale', cover: '/static/images/activity/sale.png', description: '热门车型低至7折，限时抢购', startTime: '04-04', endTime: '04-06', participantCount: 1256 },
  { id: 'A002', name: '新用户首单立减20元', type: 'new_user', cover: '/static/images/activity/newuser.png', description: '新用户专享，首单立减20元', startTime: '04-01', endTime: '04-30', participantCount: 3456 },
  { id: 'A003', name: '会员专享9折优惠', type: 'member_only', cover: '/static/images/activity/member.png', description: '会员用户专享全场9折', startTime: '04-01', endTime: '06-30', participantCount: 1890 },
])

const upcomingList = ref<ActivityItem[]>([
  { id: 'A004', name: '五一出行季', type: 'flash_sale', cover: '/static/images/activity/mayday.png', description: '五一假期出行，租车更优惠', startTime: '04-28', endTime: '05-05', participantCount: 0, countdown: '22天' },
])

const endedList = ref<ActivityItem[]>([
  { id: 'A005', name: '春节限时特价', type: 'flash_sale', cover: '/static/images/activity/spring.png', description: '春节出行特惠，低至6折', startTime: '01-25', endTime: '02-10', participantCount: 4567 },
])

const loading = ref(false)
const noMore = ref(false)

const isEmpty = computed(() => {
  if (activeTab.value === 'ongoing') return ongoingList.value.length === 0
  if (activeTab.value === 'upcoming') return upcomingList.value.length === 0
  if (activeTab.value === 'ended') return endedList.value.length === 0
  return true
})

// ---------- 方法 ----------
function switchTab(key: string): void {
  activeTab.value = key
}

function goDetail(id: string): void {
  uni.navigateTo({ url: `/pages/activity/detail?id=${id}` })
}

function goMyActivity(): void {
  uni.navigateTo({ url: '/pages-sub/activity/my' })
}

function loadMore(): void {
  if (loading.value || noMore.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    noMore.value = true
  }, 1000)
}

function getTypeName(type: string): string {
  const map: Record<string, string> = {
    flash_sale: '限时特价',
    discount: '满减',
    new_user: '新人专享',
    member_only: '会员专享',
    invitation: '邀请有礼',
  }
  return map[type] || '活动'
}
</script>

<style lang="scss" scoped>
.activity-list-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

// ========== Tab ==========
.tabs-container {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  position: sticky;
  top: 0;
  z-index: 10;
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
  }
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  background: #1890ff;
  border-radius: 3rpx;
}

// ========== 活动卡片 ==========
.activity-scroll {
  height: calc(100vh - 88rpx - 100rpx);
  padding: 20rpx;
}

.activity-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  position: relative;

  &.upcoming {
    border: 2rpx solid #faad14;
  }

  &.ended {
    opacity: 0.7;
  }
}

.activity-cover {
  width: 100%;
  height: 280rpx;
}

.activity-info {
  padding: 24rpx;
}

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.activity-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  color: #fff;

  &.tag-flash_sale { background: linear-gradient(135deg, #ff4d4f, #ff7875); }
  &.tag-discount { background: linear-gradient(135deg, #faad14, #ffc53d); }
  &.tag-new_user { background: linear-gradient(135deg, #52c41a, #73d13d); }
  &.tag-member_only { background: linear-gradient(135deg, #1890ff, #40a9ff); }
  &.tag-invitation { background: linear-gradient(135deg, #722ed1, #9254de); }
}

.activity-desc {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.activity-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.activity-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.activity-stats {
  font-size: 24rpx;
  color: #1890ff;
}

.upcoming-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: linear-gradient(135deg, #faad14, #ffc53d);
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  z-index: 2;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #faad14;
}

.countdown-time {
  font-weight: 600;
  font-size: 28rpx;
}

.ended-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 28rpx;
  padding: 12rpx 40rpx;
  border-radius: 30rpx;
  z-index: 2;
}

.ended-text {
  font-size: 24rpx;
  color: #999;
}

// ========== 空状态 ==========
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-image {
  width: 240rpx;
  height: 240rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
}

// ========== 加载状态 ==========
.loading-tip, .no-more-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #999;
}

// ========== 我的活动入口 ==========
.my-activity-entry {
  position: fixed;
  bottom: calc(100rpx + env(safe-area-inset-bottom));
  right: 30rpx;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 30rpx;
  border-radius: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(24, 144, 255, 0.4);
  z-index: 100;

  .entry-text {
    font-size: 26rpx;
  }
}
</style>