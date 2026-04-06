<template>
  <view class="violation-page">
    <!-- 说明卡片 -->
    <view class="notice-card">
      <view class="notice-icon">⚠️</view>
      <view class="notice-body">
        <text class="notice-title">违章押金说明</text>
        <text class="notice-desc">还车后系统将自动冻结违章押金，30天观察期内如无违章记录将自动退还到您的账户。</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      scroll-y
      class="v-list-scroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="v-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="v-card"
          @click="goDetail(item)"
        >
          <!-- 头部：状态+金额 -->
          <view class="v-header">
            <view
              class="v-status"
              :class="getStatusClass(item.status)"
            >
              {{ getStatusText(item.status) }}
            </view>
            <text class="v-amount">¥{{ (item.amountCents / 100).toFixed(2) }}</text>
          </view>

          <!-- 详情 -->
          <view class="v-info">
            <view v-if="item.orderNo" class="v-row">
              <text class="label">关联订单</text>
              <text class="value">{{ item.orderNo }}</text>
            </view>
            <view class="v-row">
              <text class="label">观察期截止</text>
              <text class="value">{{ formatDate(item.observationEndAt) }}</text>
            </view>
            <view v-if="item.deductionAmountCents && item.deductionAmountCents > 0" class="v-row">
              <text class="label">扣除金额</text>
              <text class="value deduct">-¥{{ (item.deductionAmountCents / 100).toFixed(2) }}</text>
            </view>
            <view v-if="item.refundAmountCents !== undefined" class="v-row">
              <text class="label">退还金额</text>
              <text class="value refund">+¥{{ (item.refundAmountCents / 100).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 时间线 -->
          <view class="v-timeline">
            <view v-if="item.createdAt" class="t-item">
              <view class="t-dot frozen" />
              <text>冻结于 {{ formatDate(item.createdAt) }}</text>
            </view>
            <view v-if="item.deductedAt" class="t-item">
              <view class="t-dot deducted" />
              <text>扣除于 {{ formatDate(item.deductedAt) }}</text>
            </view>
            <view v-if="item.refundedAt" class="t-item">
              <view class="t-dot refunded" />
              <text>退还于 {{ formatDate(item.refundedAt) }}</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more">加载中...</view>
        <view v-else-if="page > 1" class="no-more">— 已加载全部 —</view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <text>暂无违章押金记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getViolationList } from '@/api/violation'
import type { ViolationDeposit, ViolationDepositStatus } from '@/types/extended'

// ==================== 状态 ====================
const list = ref<ViolationDeposit[]>([])
const page = ref(1)
const pageSize = 15
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)

// ==================== 方法 ====================

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) page.value = 1
    const res = await getViolationList({ page: page.value, size: pageSize })
    const newList = res.data?.list || []
    list.value = reset ? newList : [...list.value, ...newList]
    hasMore.value = list.value.length < (res.data?.total || 0)
    page.value++
  } catch (e) {
    console.error('加载违章押金失败:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  await loadData(true)
}

function goDetail(item: ViolationDeposit) {
  // 弹窗展示详细信息（含违章凭证等）
  uni.showModal({
    title: '违章押金详情',
    content:
      `状态: ${getStatusText(item.status)}\n` +
      `押金: ¥${(item.amountCents / 100).toFixed(2)}\n` +
      `冻结时间: ${formatDate(item.createdAt)}\n` +
      (item.violationDetail ? `违章说明: ${item.violationDetail}` : ''),
    showCancel: false,
    confirmText: '知道了',
  })
}

function getStatusText(status: ViolationDepositStatus): string {
  const map: Record<ViolationDepositStatus, string> = {
    FROZEN: '已冻结',
    DEDUCTED: '已扣除',
    REFUNDED: '已退还',
    PARTIAL_REFUND: '部分退还',
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  return `s-${status.toLowerCase()}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ==================== 生命周期 ====================

onShow(() => {
  loadData(true)
})
</script>

<style lang="scss" scoped>
.violation-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.notice-card {
  margin: 24rpx;
  padding: 24rpx;
  background: #fffbe6;
  border-radius: 12rpx;
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}

.notice-icon {
  font-size: 36rpx;
}

.notice-body {
  flex: 1;
}

.notice-title {
  font-size: 27rpx;
  font-weight: 600;
  color: #d48806;
  display: block;
}

.notice-desc {
  font-size: 25rpx;
  color: #ad8a00;
  display: block;
  margin-top: 8rpx;
  line-height: 1.5;
}

.v-list-scroll {
  height: calc(100vh - 200rpx);
}

.v-list {
  padding: 0 24rpx;
}

.v-card {
  background: #fff;
  border-radius: 14rpx;
  margin-bottom: 18rpx;
  overflow: hidden;
}

.v-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 28rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.v-status {
  font-size: 23rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;

  .s-frozen { background: #e6f7ff; color: #1890ff; }
  .s-deducted { background: #fff2f0; color: #ff4d4f; }
  .s-refunded { background: #f6ffed; color: #52c41a; }
  .s-partial_refund { background: #fcffe6; color: #a0d911; }
}

.v-amount {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
}

.v-info {
  padding: 20rpx 28rpx;
}

.v-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 25rpx;

  .label { color: #999; }

  .value {
    color: #333;

    &.deduct { color: #ff4d4f; font-weight: 600; }
    &.refund { color: #52c41a; font-weight: 600; }
  }
}

.v-timeline {
  padding: 16rpx 28rpx 22rpx;
  border-top: 1rpx dashed #eee;
}

.t-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 23rpx;
  color: #888;
  padding: 4rpx 0;
}

.t-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;

  &.frozen { background: #1890ff; }
  &.deducted { background: #ff4d4f; }
  &.refunded { background: #52c41a; }
}

.load-more,
.no-more {
  text-align: center;
  padding: 28rpx;
  font-size: 25rpx;
  color: #999;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  font-size: 27rpx;
  color: #999;
}
</style>
