<template>
  <view class="points-page">
    <!-- 积分概览卡片 -->
    <view class="points-overview">
      <view class="po-main">
        <text class="po-label">当前积分</text>
        <text class="po-balance">{{ pointsInfo.balance }}</text>
      </view>
      <view class="po-extra">
        <view class="po-stat">
          <text class="stat-value">{{ pointsInfo.continuousDays || 0 }}</text>
          <text class="stat-label">连续签到(天)</text>
        </view>
        <view class="po-divider" />
        <button
          class="btn-signin"
          :class="{ signed: pointsInfo.todaySigned }"
          :disabled="pointsInfo.todaySigned"
          @click="handleSignIn"
        >
          {{ pointsInfo.todaySigned ? '✓ 已签到' : '立即签到' }}
        </button>
      </view>
    </view>

    <!-- 积分规则说明 -->
    <view class="rules-section">
      <view class="section-title">赚积分攻略</view>
      <view class="rule-cards">
        <view v-for="rule in rules" :key="rule.type" class="rule-card">
          <text class="r-icon">{{ rule.icon }}</text>
          <view class="r-content">
            <text class="r-name">{{ rule.name }}</text>
            <text class="r-desc">{{ rule.desc }}</text>
          </view>
          <view class="r-points">
            <text class="rp-value">+{{ rule.points }}</text>
            <text class="rp-unit">积分</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 积分明细 -->
    <scroll-view
      scroll-y
      class="records-scroll"
      @scrolltolower="loadMoreRecords"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="section-header">
        <text class="section-title">积分明细</text>
      </view>

      <view v-if="records.length > 0" class="records-list">
        <view v-for="(item, index) in records" :key="index" class="record-item">
          <view class="record-left">
            <view
              class="record-dot"
              :style="{ background: item.points > 0 ? '#52c41a' : '#ff4d4f' }"
            />
            <view class="record-info">
              <text class="record-desc">{{ item.description || getRuleName(item.type) }}</text>
              <text class="record-time">{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
          <text
            class="record-points"
            :class="item.points > 0 ? 'gain' : 'spend'"
          >
            {{ item.points > 0 ? '+' : '' }}{{ item.points }}
          </text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-text">暂无积分记录，去签到赚取吧~</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getPointsBalance,
  getPointsRecords,
  signIn as apiSignIn,
} from '@/api/points'
import type { PointsInfo, PointsRecord } from '@/types/extended'

// ==================== 状态 ====================

const pointsInfo = reactive<PointsInfo>({
  balance: 0,
  todaySigned: false,
  continuousDays: 0,
})

const records = ref<PointsRecord[]>([])
const recordPage = ref(1)
const recordSize = 15
const hasMoreRecords = ref(true)
const refreshing = ref(false)

// 积分规则
const rules = [
  { type: 'SIGN_IN', name: '每日签到', icon: '📅', desc: '每天签到即可获得', points: 5 },
  { type: 'ORDER_COMPLETE', name: '完成订单', icon: '🚗', desc: '订单完成后自动发放', points: '1%' },
  { type: 'REVIEW', name: '发表评价', icon: '⭐', desc: '图文评价额外加成', points: '+20' },
  { type: 'INVITE', name: '邀请好友', icon: '👥', desc: '邀请注册成功即得', points: 100 },
]

// ==================== 方法 ====================

async function loadBalance() {
  try {
    const res = await getPointsBalance()
    if (res.data) Object.assign(pointsInfo, res.data)
  } catch (e) {
    console.error('获取积分失败:', e)
  }
}

async function loadRecords(reset = false) {
  try {
    if (reset) recordPage.value = 1
    const res = await getPointsRecords({ page: recordPage.value, size: recordSize })
    const list = res.data?.list || []
    records.value = reset ? list : [...records.value, ...list]
    hasMoreRecords.value = records.value.length < (res.data?.total || 0)
    recordPage.value++
  } catch (e) {
    console.error('加载积分记录失败:', e)
  }
}

function loadMoreRecords() {
  if (!hasMoreRecords.value) return
  loadRecords()
}

async function onRefresh() {
  refreshing.value = true
  await Promise.all([loadBalance(), loadRecords(true)])
  refreshing.value = false
}

async function handleSignIn() {
  if (pointsInfo.todaySigned) return

  uni.showLoading({ title: '签到中...' })

  try {
    const res = await apiSignIn()
    uni.hideLoading()

    // 更新本地状态
    pointsInfo.todaySigned = true
    pointsInfo.balance += res.data?.pointsEarned || 5

    uni.showToast({
      title: `签到成功！+${res.data?.pointsEarned || 5}积分`,
      icon: 'success',
    })

    // 刷新列表
    loadRecords(true)
  } catch (e) {
    uni.hideLoading()
  }
}

function getRuleName(type: string): string {
  const map: Record<string, string> = {
    SIGN_IN: '每日签到奖励',
    ORDER_COMPLETE: '完成订单获得',
    REVIEW: '评价获得',
    INVITE: '邀请好友奖励',
  }
  return map[type] || '其他'
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

// ==================== 生命周期 ====================

onShow(() => {
  loadBalance()
  loadRecords(true)
})
</script>

<style lang="scss" scoped>
.points-page {
  min-height: 100vh;
  background: #f5f7fa;
}

// 积分概览卡片
.points-overview {
  margin: 24rpx;
  padding: 40rpx;
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
  border-radius: 20rpx;
  color: #fff;
}

.po-main {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.po-label {
  font-size: 26rpx;
  opacity: 0.85;
}

.po-balance {
  font-size: 72rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
}

.po-extra {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.po-stat {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
}

.stat-label {
  font-size: 21rpx;
  opacity: 0.75;
}

.po-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.2);
}

.btn-signin {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 36rpx;
  background: #fff;
  color: #d48806;
  font-size: 27rpx;
  font-weight: 600;
  border-radius: 32rpx;
  border: none;

  &::after {
    display: none;
  }

  &.signed {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
}

// 规则说明
.rules-section {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

.rule-cards {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rule-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx;
  background: #fafafa;
  border-radius: 12rpx;
}

.r-icon {
  font-size: 40rpx;
}

.r-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.r-name {
  font-size: 27rpx;
  color: #333;
  font-weight: 500;
}

.r-desc {
  font-size: 23rpx;
  color: #999;
}

.r-points {
  text-align: right;

  .rp-value {
    font-size: 34rpx;
    font-weight: 700;
    color: #faad14;
    display: block;
  }

  .rp-unit {
    font-size: 21rpx;
    color: #bbb;
  }
}

// 明细列表
.records-scroll {
  height: calc(100vh - 520rpx);
  margin: 0 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
}

.section-header {
  margin-bottom: 16rpx;
}

.records-list {
  // ...
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.record-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.record-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.record-desc {
  font-size: 27rpx;
  color: #333;
}

.record-time {
  font-size: 23rpx;
  color: #999;
}

.record-points {
  font-size: 32rpx;
  font-weight: 700;

  &.gain { color: #52c41a; }
  &.spend { color: #ff4d4f; }
}

.empty-state {
  padding: 80rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>
