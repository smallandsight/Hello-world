<template>
  <view class="ticket-list-page">
    <!-- 状态筛选 Tab -->
    <scroll-view scroll-x class="filter-bar">
      <view class="filter-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentStatus === tab.value }"
          @click="switchTab(tab.value)"
        >{{ tab.label }}</view>
      </view>
    </scroll-view>

    <!-- 工单列表 -->
    <scroll-view
      scroll-y
      class="ticket-scroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="ticket-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="ticket-card"
          @click="goDetail(item.id)"
        >
          <view class="card-header">
            <view
              class="category-tag"
              :class="`cat-${item.category}`"
            >{{ getCategoryName(item.category) }}</view>
            <view
              class="status-badge"
              :class="getStatusClass(item.status)"
            >{{ getStatusText(item.status) }}</view>
          </view>

          <text class="ticket-title">{{ item.title }}</text>
          <text class="ticket-desc">{{ truncate(item.content, 60) }}</text>

          <view class="card-footer">
            <text class="ticket-time">{{ formatTime(item.createdAt) }}</text>
            <view v-if="item.replyCount && item.replyCount > 0" class="reply-count">
              {{ item.replyCount }}条回复
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more">加载中...</view>
        <view v-else-if="page > 1" class="no-more">— 已加载全部 —</view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <image src="/static/icons/empty-ticket.png" mode="aspectFit" class="empty-img" />
        <text class="empty-text">暂无工单</text>
        <button class="btn-create" @click="goCreate">提交新工单</button>
      </view>
    </scroll-view>

    <!-- 悬浮创建按钮 -->
    <view class="fab-btn" @click="goCreate">
      <text>+</text>
    </view>
  </view>
</template>

<script setup lang="ts"]>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyTickets } from '@/api/ticket'
import type { Ticket, TicketCategory, TicketStatus } from '@/types/extended'

// ==================== 状态 ====================

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待受理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '待补充', value: 'WAITING_USER' },
  { label: '已解决', value: 'RESOLVED' },
]

const currentStatus = ref('')
const list = ref<Ticket[]>([])
const page = ref(1)
const pageSize = 15
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)

// ==================== 方法 ====================

function switchTab(status: string) {
  currentStatus.value = status
  loadData(true)
}

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) page.value = 1
    const res = await getMyTickets({
      page: page.value,
      size: pageSize,
      status: currentStatus.value || undefined,
    })
    const newList = res.data?.list || []
    list.value = reset ? newList : [...list.value, ...newList]
    hasMore.value = list.value.length < (res.data?.total || 0)
    page.value++
  } catch (e) {
    console.error('加载工单失败:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function loadMore() {
  if (!hasMore.value) return
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  await loadData(true)
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/ticket/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/ticket/create' })
}

function getCategoryName(cat: TicketCategory): string {
  const map: Record<string, string> = {
    order_issue: '订单问题',
    payment: '支付纠纷',
    vehicle: '车辆问题',
    refund: '退款申请',
    account: '账号问题',
    suggestion: '建议投诉',
    accident: '事故纠纷',
    other: '其他',
  }
  return map[cat] || cat
}

function getStatusText(status: string): string {
  const map: Record<TicketStatus, string> = {
    PENDING: '待受理',
    PROCESSING: '处理中',
    WAITING_USER: '待您补充',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
    REJECTED: '已拒绝',
    REOPENED: '重新打开',
  }
  return map[status as TicketStatus] || status
}

function getStatusClass(status: string): string {
  return `badge-${(status as string).toLowerCase()}`
}

function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

// ==================== 生命周期 ====================
onShow(() => {
  loadData(true)
})
</script>

<style lang="scss" scoped>
.ticket-list-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.filter-bar {
  background: #fff;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #eee;
}

.filter-tabs {
  display: inline-flex;
  padding: 20rpx 24rpx;
  gap: 16rpx;
}

.filter-tab {
  padding: 12rpx 28rpx;
  font-size: 25rpx;
  color: #666;
  border-radius: 30rpx;
  flex-shrink: 0;

  &.active {
    color: #1890ff;
    background: #e6f7ff;
    font-weight: 500;
  }
}

.ticket-scroll {
  height: calc(100vh - 80rpx);
}

.ticket-list {
  padding: 24rpx;
}

.ticket-card {
  background: #fff;
  border-radius: 14rpx;
  margin-bottom: 18rpx;
  padding: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.category-tag {
  font-size: 21rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  color: #fff;

  .cat-order_issue { background: #1890ff; }
  .cat-payment { background: #faad14; }
  .cat-vehicle { background: #13c2c2; }
  .cat-refund { background: #ff4d4f; }
  .cat-account { background: #722ed1; }
  .cat-suggestion { background: #52c41a; }
  .cat-accident { background: #cf1322; }
  .cat-other { background: #8c8c8c; }
}

.status-badge {
  font-size: 21rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;

  .badge-pending { background: #fff7e6; color: #d48806; }
  .badge-processing { background: #e6f7ff; color: #1890ff; font-weight: 500; }
  .badge-waiting_user { background: #f9f0ff; color: #722ed1; }
  .badge-resolved { background: #f6ffed; color: #52c41a; }
  .badge-closed { background: #f5f5f5; color: #999; }
  .badge-rejected { background: #fff2f0; color: #cf1322; }
  .badge-reopened { background: #fcffe6; color: #a0d911; }
}

.ticket-title {
  font-size: 29rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 6rpx;
}

.ticket-desc {
  font-size: 25rpx;
  color: #888;
  display: block;
  line-height: 1.45;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f5f5f5;
}

.ticket-time {
  font-size: 23rpx;
  color: #bbb;
}

.reply-count {
  font-size: 22rpx;
  color: #1890ff;
  background: #e6f7ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;
}

.empty-img {
  width: 220rpx;
  height: 220rpx;
  opacity: 0.3;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 29rpx;
  color: #999;
}

.btn-create {
  margin-top: 32rpx;
  width: 280rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #1890ff;
  color: #fff;
  font-size: 27rpx;
  border-radius: 36rpx;
  border: none;

  &::after {
    display: none;
  }
}

// 悬浮按钮
.fab-btn {
  position: fixed;
  right: 36rpx;
  bottom: 120rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  box-shadow: 0 8rpx 24rpx rgba(24, 144, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 52rpx;
    color: #fff;
    line-height: 1;
    margin-top: -4rpx;
  }
}
</style>
