<template>
  <view class="renewal-page">
    <!-- 空状态提示 -->
    <view v-if="list.length === 0 && !loading" class="empty-state">
      <image src="/static/icons/empty-order.png" mode="aspectFit" class="empty-img" />
      <text class="empty-text">暂无续租记录</text>
      <text class="empty-desc">使用中的订单可在详情页发起续租申请</text>
    </view>

    <!-- 续租列表 -->
    <scroll-view
      v-else
      scroll-y
      class="renewal-list-scroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="renewal-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="renewal-card"
        >
          <!-- 状态标签 -->
          <view class="card-header">
            <text class="order-label">订单续租</text>
            <view
              class="status-badge"
              :class="getStatusClass(item.status)"
            >
              {{ getStatusText(item.status) }}
            </view>
          </view>

          <!-- 续租信息 -->
          <view class="card-body">
            <view class="info-row">
              <text class="info-label">原归还时间</text>
              <text class="info-value">{{ formatDateTime(item.originalReturnTime) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">新归还时间</text>
              <text class="info-value highlight">{{ formatDateTime(item.newReturnTime) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">续租天数</text>
              <text class="info-value">+{{ item.extraDays }} 天</text>
            </view>
            <view class="info-row">
              <text class="info-label">续租费用</text>
              <text class="info-value price">¥{{ (item.amountCents / 100).toFixed(2) }}</text>
            </view>

            <!-- 拒绝原因 -->
            <view v-if="item.rejectReason" class="reject-reason">
              <text>拒绝原因：{{ item.rejectReason }}</text>
            </view>
          </view>

          <!-- 底部操作栏 -->
          <view class="card-footer">
            <text class="apply-time">申请时间：{{ formatDate(item.createdAt) }}</text>
            <!-- 待支付时显示支付按钮 -->
            <button
              v-if="item.status === 'APPROVED'"
              class="btn-pay"
              @click="payRenewal(item)"
            >立即支付</button>
          </view>
        </view>
      </view>

      <view v-if="hasMore && loading" class="load-more">加载中...</view>
      <view v-else-if="page > 1 && !hasMore" class="no-more">— 已加载全部 —</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyRenewals, payRenewal as apiPay } from '@/api/renewal'
import type { Renewal, RenewalStatus } from '@/types/extended'

// ==================== 状态 ====================

const list = ref<Renewal[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)

// ==================== 方法 ====================

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) page.value = 1
    const res = await getMyRenewals({ page: page.value, size: pageSize })
    const newList = res.data?.list || []
    list.value = reset ? newList : [...list.value, ...newList]
    hasMore.value = list.value.length < (res.data?.total || 0)
    page.value++
  } catch (e) {
    console.error('加载续租记录失败:', e)
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

async function payRenewal(item: Renewal) {
  uni.showModal({
    title: '确认支付',
    content: `续租费用 ¥${(item.amountCents / 100).toFixed(2)}，确认支付？`,
    success: async (res) => {
      if (!res.confirm) return
      uni.showLoading({ title: '处理中...' })

      try {
        const result = await apiPay(item.id)
        uni.hideLoading()
        // 跳转支付页
        uni.navigateTo({
          url: `/pages/payment/index?paymentNo=${result.data.paymentNo}`,
        })
      } catch (e) {
        uni.hideLoading()
      }
    },
  })
}

function getStatusText(status: RenewalStatus): string {
  const map: Record<RenewalStatus, string> = {
    PENDING: '待审批',
    APPROVED: '待支付',
    REJECTED: '已拒绝',
    PAID: '已完成',
    CANCELLED: '已取消',
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  return `badge-${status.toLowerCase()}`
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
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
.renewal-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.renewal-list-scroll {
  height: 100vh;
}

.renewal-list {
  padding: 24rpx;
}

.renewal-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #fafafa;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-label {
  font-size: 27rpx;
  color: #666;
}

.status-badge {
  font-size: 23rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;

  .badge-pending { background: #fff7e6; color: #faad14; }
  .badge-approved { background: #e6f7ff; color: #1890ff; font-weight: 600; }
  .badge-rejected { background: #fff2f0; color: #ff4d4f; }
  .badge-paid { background: #f6ffed; color: #52c41a; }
  .badge-cancelled { background: #f5f5f5; color: #999; }
}

.card-body {
  padding: 28rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid #f9f9f9;
  }
}

.info-label {
  font-size: 26rpx;
  color: #888;
}

.info-value {
  font-size: 27rpx;
  color: #333;

  &.highlight {
    color: #1890ff;
    font-weight: 600;
  }

  &.price {
    color: #ff4d4f;
    font-weight: 700;
    font-size: 30rpx;
  }
}

.reject-reason {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #fff2f0;
  border-radius: 8rpx;
  font-size: 25rpx;
  color: #cf1322;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}

.apply-time {
  font-size: 23rpx;
  color: #bbb;
}

.btn-pay {
  min-width: 160rpx;
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 32rpx;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  border-radius: 30rpx;
  border: none;

  &::after {
    display: none;
  }
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
  opacity: 0.35;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 29rpx;
  color: #999;
  font-weight: 500;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 25rpx;
  color: #bbb;
}
</style>
