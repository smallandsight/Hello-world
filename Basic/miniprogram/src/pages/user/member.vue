<template>
  <view class="member-page">
    <!-- 会员卡区域 -->
    <view class="member-card" :class="`level-${memberInfo.level}`">
      <view class="card-bg-decoration" />
      <view class="card-content">
        <!-- 等级信息 -->
        <view class="level-header">
          <view class="level-badge">{{ memberInfo.levelName }}</view>
          <text v-if="memberInfo.level > 1" class="level-tag">尊享会员</text>
        </view>

        <!-- 权益列表 -->
        <view class="benefits-row">
          <view class="benefit-item">
            <text class="b-value">{{ (memberInfo.discountRate * 10).toFixed(1) }}折</text>
            <text class="b-label">租车折扣</text>
          </view>
          <view class="benefit-divider" />
          <view class="benefit-item">
            <text class="b-value">{{ memberInfo.pointsRate }}x</text>
            <text class="b-label">积分倍率</text>
          </view>
        </view>

        <!-- 升级进度 -->
        <view v-if="memberInfo.level < 4" class="progress-section">
          <view class="progress-header">
            <text>距离{{ getNextLevelName() }}还差</text>
            <text class="progress-amount">¥{{ getRemainingAmount() }}</text>
          </view>
          <view class="progress-bar-track">
            <view
              class="progress-bar-fill"
              :style="{ width: `${memberInfo.progressPercent || 0}%` }"
            />
          </view>
          <view class="progress-footer">
            <text>已消费 ¥{{ (memberInfo.totalSpentCents / 100).toFixed(2) }}</text>
            <text>需 ¥{{ ((memberInfo.nextLevelSpentCents || 0) / 100).toFixed(2) }}</text>
          </view>
        </view>

        <view v-else class="max-level-hint">
          <text class="max-icon">👑</text>
          <text class="max-text">您已是最高等级会员</text>
        </view>
      </view>
    </view>

    <!-- 等级权益说明 -->
    <view class="privilege-section">
      <view class="section-title">会员等级权益</view>
      <view class="level-list">
        <view
          v-for="(lv, index) in levels"
          :key="index"
          class="level-item"
          :class="{ active: memberInfo.level === lv.level, locked: memberInfo.level < lv.level }"
        >
          <view class="level-left">
            <view class="lv-num">{{ lv.level }}</view>
            <view class="lv-info">
              <text class="lv-name">{{ lv.name }}</text>
              <text class="lv-condition">累计消费满 ¥{{ (lv.minSpent / 100).toFixed(0) }}</text>
            </view>
          </view>
          <view class="level-right">
            <text class="lv-discount">{{ (lv.discount * 10).toFixed(1) }}折</text>
            <text class="lv-points">{{ lv.points }}x积分</text>
          </view>
          <view v-if="memberInfo.level === lv.level" class="current-badge">当前</view>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-section">
      <view class="section-title">会员服务</view>
      <view class="service-grid">
        <view
          v-for="item in services"
          :key="item.name"
          class="service-item"
          @click="navigateTo(item.path)"
        >
          <text class="s-icon">{{ item.icon }}</text>
          <text class="s-name">{{ item.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { MemberLevelInfo } from '@/types/extended'

// ==================== 数据 ====================

const memberInfo = reactive<MemberLevelInfo>({
  level: 1,
  levelName: '普通会员',
  totalSpentCents: 0,
  discountRate: 1.0,
  pointsRate: 1,
  progressPercent: 0,
})

// 四个等级定义
const levels = [
  { level: 1, name: '普通会员', minSpent: 0, discount: 1.0, points: 1 },
  { level: 2, name: '银卡会员', minSpent: 200000, discount: 0.95, points: 1.2 },
  { level: 3, name: '金卡会员', minSpent: 800000, discount: 0.90, points: 1.5 },
  { level: 4, name: '钻石会员', minSpent: 2000000, discount: 0.85, points: 2.0 },
]

// 服务入口
const services = [
  { icon: '🎫', name: '优惠券', path: '/pages/user/coupon' },
  { icon: '⭐', name: '积分中心', path: '/pages/user/points' },
  { icon: '💰', name: '我的钱包', path: '/pages/user/wallet' },
  { icon: '🧾', name: '我的发票', path: '/pages/user/invoice' },
  { icon: '❤️', name: '我的收藏', path: '/pages/user/favorite' },
  { icon: '📝', name: '我的评价', path: '' }, // TODO: 评价页面路由
]

// ==================== 方法 ====================

async function loadMemberInfo() {
  try {
    // 调用用户会员等级接口
    const { get } = await import('@/api/user')
    const res = await get('/user/member/progress')
    if (res.data) {
      Object.assign(memberInfo, res.data)
    }
  } catch (e) {
    console.error('加载会员信息失败:', e)
    // 使用默认数据展示
  }
}

function getNextLevelName(): string {
  const current = memberInfo.level
  if (current >= 4) return ''
  const next = levels.find((l) => l.level === current + 1)
  return next?.name || ''
}

function getRemainingAmount(): string {
  if (!memberInfo.nextLevelSpentCents) return '0'
  const remaining = Math.max(
    0,
    (memberInfo.nextLevelSpentCents - memberInfo.totalSpentCents) / 100,
  )
  return remaining.toFixed(0)
}

function navigateTo(path: string) {
  if (!path) {
    uni.showToast({ title: '功能开发中', icon: 'none' })
    return
  }
  uni.navigateTo({ url: path })
}

// ==================== 生命周期 ====================
onShow(() => {
  loadMemberInfo()
})
</script>

<style lang="scss" scoped>
.member-page {
  min-height: 100vh;
  background: #f5f7fa;
}

// 会员卡片 — 渐变背景按等级区分
.member-card {
  margin: 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  padding: 40rpx;
  color: #fff;

  &.level-1 {
    background: linear-gradient(135deg, #8c8c8c 0%, #595959 100%);
  }

  &.level-2 {
    background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 50%, #8c8c8c 100%);
  }

  &.level-3 {
    background: linear-gradient(135deg, #d4af37 0%, #c5a028 50%, #aa8c1e 100%);
  }

  &.level-4 {
    background:
      linear-gradient(135deg, #1a1a3e 0%,
        #2d1b69 30%,
        #6b3fa0 60%,
        #b088cc 100%);
    box-shadow: 0 8rpx 32rpx rgba(107, 63, 160, 0.35);
  }
}

.card-bg-decoration {
  position: absolute;
  top: -80rpx;
  right: -80rpx;
  width: 280rpx;
  height: 280rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
}

.card-content {
  position: relative;
  z-index: 1;
}

.level-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.level-badge {
  font-size: 42rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.level-tag {
  font-size: 21rpx;
  padding: 4rpx 14rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 20rpx;
}

.benefits-row {
  display: flex;
  align-items: center;
  gap: 36rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14rpx;
  margin-bottom: 32rpx;
}

.benefit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.b-value {
  font-size: 38rpx;
  font-weight: 700;
}

.b-label {
  font-size: 23rpx;
  opacity: 0.8;
}

.benefit-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.2);
}

// 升级进度
.progress-section {
  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 25rpx;
    opacity: 0.9;
    margin-bottom: 12rpx;
  }

  .progress-amount {
    font-weight: 600;
  }
}

.progress-bar-track {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #fff;
  border-radius: 6rpx;
  transition: width 0.5s ease;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  opacity: 0.7;
  margin-top: 8rpx;
}

// 最高等级提示
.max-level-hint {
  text-align: center;
  padding: 16rpx 0;

  .max-icon {
    font-size: 48rpx;
    display: block;
  }

  .max-text {
    font-size: 26rpx;
    opacity: 0.9;
  }
}

// 权益说明
.privilege-section,
.quick-section {
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

.level-list {
  .level-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 22rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    position: relative;
    opacity: 0.7;

    &.active {
      opacity: 1;
      background: #f0f9ff;
      padding: 22rpx 16rpx;
      margin: 0 -16rpx;
      border-radius: 10rpx;
    }
  }
}

.level-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.lv-num {
  width: 52rpx;
  height: 52rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 50%;
  background: #f0f0f0;
  font-size: 26rpx;
  font-weight: 700;
  color: #666;
}

.lv-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.lv-name {
  font-size: 27rpx;
  font-weight: 500;
  color: #333;
}

.lv-condition {
  font-size: 23rpx;
  color: #999;
}

.level-right {
  text-align: right;
}

.lv-discount {
  font-size: 27rpx;
  font-weight: 600;
  color: #1890ff;
  display: block;
}

.lv-points {
  font-size: 23rpx;
  color: #999;
}

.current-badge {
  font-size: 19rpx;
  padding: 2rpx 10rpx;
  background: #1890ff;
  color: #fff;
  border-radius: 6rpx;
  position: absolute;
  right: 0;
}

// 服务网格
.service-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20rpx;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 0;
}

.s-icon {
  font-size: 44rpx;
}

.s-name {
  font-size: 23rpx;
  color: #666;
}
</style>
