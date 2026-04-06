<template>
  <view class="page-order-detail">
    <!-- 状态卡片 -->
    <view class="status-card" :class="statusBgClass">
      <text class="status-label">{{ order.statusText }}</text>
      <text class="status-desc" v-if="statusDesc">{{ statusDesc }}</text>
      <!-- 取车码 / 还车码 -->
      <view v-if="order.pickupCode" class="code-box">
        <text class="code-label">取车码</text>
        <text class="code-number">{{ order.pickupCode }}</text>
      </view>
      <view v-if="order.returnCode" class="code-box">
        <text class="code-label">还车码</text>
        <text class="code-number">{{ order.returnCode }}</text>
      </view>
    </view>

    <!-- 车辆信息 -->
    <view class="card">
      <view class="card-title">车辆信息</view>
      <view class="info-row">
        <image class="car-thumb" :src="order.vehicleImage" mode="aspectFill" />
        <view class="car-detail">
          <text class="name">{{ order.vehicleName }}</text>
          <text class="no">车牌：{{ order.vehicleNo || '--' }}</text>
          <text class="spec">自动挡 · {{ order.feeDetail?.rentalDays ?? '?' }}天</text>
        </view>
      </view>
    </view>

    <!-- 取还车信息 -->
    <view class="card">
      <view class="card-title">取还车信息</view>
      <view class="time-line">
        <view class="line-dot dot-start"></view>
        <div class="line-bar"></div>
        <view class="line-content">
          <text class="tl-time">{{ formatTime(order.startTime) }}</text>
          <text class="tl-place">{{ order.storeName }}</text>
          <text class="tl-address">{{ order.storeAddress }}</text>
        </view>
      </view>
      <view class="time-line">
        <view class="line-dot dot-end"></view>
        <div class="line-empty"></div>
        <view class="line-content">
          <text class="tl-time">{{ formatTime(order.endTime) }}</text>
          <text class="tl-place">{{ order.storeName }}</text>
          <text class="tl-address">{{ order.storeAddress }}</text>
        </view>
      </view>
      <view class="nav-btn" @click="navigateToStore">
        <text>📍 导航到店</text>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="card">
      <view class="card-title">订单信息</view>
      <view class="info-row-simple">
        <text class="label">订单编号</text><text class="value mono">{{ order.orderNo }}</text>
      </view>
      <view class="info-row-simple">
        <text class="label">下单时间</text><text class="value">{{ formatFull(order.createdAt) }}</text>
      </view>
      <view class="info-row-simple" v-if="order.paidAt">
        <text class="label">支付时间</text><text class="value">{{ formatFull(order.paidAt!) }}</text>
      </view>
      <view class="info-row-simple" v-if="order.remark">
        <text class="label">备注</text><text class="value">{{ order.remark }}</text>
      </view>
    </view>

    <!-- 费用明细 -->
    <view class="card" v-if="order.feeDetail">
      <gy-fee-detail
        title="费用明细"
        :fee="order.feeDetail"
        :collapsible="true"
        :deposit-amount="order.feeDetail.depositAmount"
        :violation-deposit="order.feeDetail.violationDeposit"
      />
    </view>

    <!-- 订单日志 -->
    <view class="card" v-if="order.logs?.length">
      <view class="card-title">订单动态</view>
      <view v-for="(log, idx) in order.logs" :key="idx" class="log-item">
        <view class="log-dot"></view>
        <div class="log-right">
          <text class="log-action">{{ log.action }}</text>
          <text class="log-detail" v-if="log.detail?.operator">
            操作人：{{ log.detail.operator }}
          </text>
          <text class="log-time">{{ formatFull(log.createdAt) }}</text>
        </div>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar safe-area-bottom" v-if="hasActions">
      <button
        v-if="order.canCancel"
        class="action-btn btn-outline"
        @click="doCancel"
      >取消订单</button>
      <button
        v-if="order.canPay"
        class="action-btn btn-primary"
        @click="doPay"
      >立即支付</button>
      <button
        v-if="order.canPickup"
        class="action-btn btn-primary"
        @click="doPickup"
      >扫码取车</button>
      <button
        v-if="order.canReturn"
        class="action-btn btn-primary"
        @click="doReturn"
      >还车结算</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as orderApi from '@/api/order'
import type { Order } from '@/types/order'
import { formatDate, formatMoney } from '@/utils/format'

let orderId: string | null = null
const order = ref<Partial<Order>>({})
const loading = ref(false)

// 状态背景色
const statusBgClass = computed(() => {
  const s = order.value.status
  const map: Record<number, string> = {
    10: 'bg-warning', 20: 'bg-primary',
    30: 'bg-success', 40: 'bg-info',
    60: 'bg-default', 70: 'bg-muted', 80: 'bg-danger',
  }
  return map[s ?? -1] || 'bg-default'
})

// 状态描述文字
const statusDesc = computed(() => {
  switch (order.value.status) {
    case 10: return '请尽快完成支付，超时将自动取消'
    case 20: return `取车时间 ${formatTime(order.value.startTime)}`
    case 30: return `预计还车时间 ${formatTime(order.value.endTime)}`
    case 40: return '正在计算费用中...'
    default: return ''
  }
})

const hasActions = computed(() =>
  (order.value.canCancel || order.value.canPay || order.value.canPickup || order.value.canReturn),
)

// ==================== 生命周期 ====================

onLoad((options) => {
  orderId = options?.id as string || null
  if (orderId) fetchDetail()
})

// ==================== 方法 ====================

async function fetchDetail() {
  loading.value = true
  try {
    const res = await orderApi.getOrderDetail(orderId!)
    order.value = res.data || {}
  } catch (e) { /* handled in request */ }
  finally { loading.value = false }
}

function formatTime(d?: string) {
  return d ? formatDate(d, 'MM-DD HH:mm') : '--'
}
function formatFull(d?: string) {
  return d ? formatDate(d) : '--'
}

function navigateToStore() {
  // TODO: 使用经纬度导航
}

async function doCancel() {
  const res = await uni.showModal({ title: '确认取消', content: '确定要取消此订单吗？' })
  if (!res.confirm) return

  try {
    await orderApi.cancelOrder(orderId!)
    uni.showToast({ title: '已取消', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch {}
}

function doPay() {
  uni.navigateTo({ url: `/pages/payment/index?orderId=${orderId}` })
}

function doPickup() {
  uni.navigateTo({ url: `/pages/order/pickup?orderId=${orderId}` })
}

function doReturn() {
  uni.navigateTo({ url: `/pages/order/return?orderId=${orderId}` })
}
</script>

<style lang="scss" scoped>
.page-order-detail { min-height: 100vh; background: var(--bg-secondary); }

/* 状态卡片 */
.status-card {
  margin: 0;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border-bottom-left-radius: 32rpx;
  border-bottom-right-radius: 32rpx;

  &.bg-warning { background: linear-gradient(135deg, #ffe58f, #ffc53d); }
  &.bg-primary { background: linear-gradient(135deg, #69c0ff, #1890ff); }
  &.bg-success { background: linear-gradient(135deg, #95de64, #52c41a); }
  &.bg-info { background: linear-gradient(135deg, #bae7ff, #40a9ff); }
  &.bg-default { background: linear-gradient(135d, #d9d9d9, #8c8c8c); }
  &.bg-muted { background: linear-gradient(135d, #bfbfbf, #8c8c8c); }

  .status-label { font-size: 36rpx; font-weight: bold; color: #fff; }
  .status-desc { font-size: 24rpx; color: rgba(255,255,255,0.85); }

  .code-box {
    display: flex;
    align-items: center;
    gap: 16rpx;
    background: rgba(255,255,255,0.2);
    padding: 14rpx 28rpx;
    border-radius: 8rpx;
    margin-top: 8rpx;
    .code-label { font-size: 22rpx; color: rgba(255,255,255,0.8); }
    .code-number { font-size: 40rpx; font-weight: bold; color: #fff; letter-spacing: 6rpx; }
  }
}

/* 通用卡片 */
.card {
  margin: 20rpx 24rpx;
  background: var(--bg-primary);
  border-radius: 16rpx;
  padding: 24rpx;

  .card-title {
    font-size: 28rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

/* 车辆行 */
.info-row {
  display: flex;
  gap: 20rpx;
  .car-thumb {
    width: 180rpx;
    height: 130rpx;
    border-radius: 12rpx;
    background: #f5f5f5;
    flex-shrink: 0;
  }
  .car-detail {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    .name { font-size: 30rpx; font-weight: 600; }
    .no, .spec { font-size: 24rpx; color: var(--text-secondary); }
  }
}

.info-row-simple {
  display: flex; justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  .label { color: var(--text-secondary); }
  .value { color: var(--text-primary); &.mono { font-family: monospace; } }
}

/* 时间线 */
.time-line {
  display: flex;
  gap: 16rpx;
  position: relative;

  &:first-of-type .line-dot { border-color: var(--primary-color); background: var(--primary-color); }
  &:last-of-type .line-dot { border-color: #52c41a; background: #52c41a; }

  .line-dot {
    width: 18rpx; height: 18rpx; border-radius: 50%; border: 3rpx solid #ddd; z-index: 1; margin-top: 6rpx; flex-shrink: 0;
  }
  .line-bar { width: 2rpx; min-height: 60rpx; background: #ddd; margin-left: 7rpx; position: absolute; top: 26rpx; }
  .line-empty { width: 2rpx; min-height: 20rpx; }

  .line-content {
    display: flex; flex-direction: column; gap: 4rpx; padding-bottom: 20rpx;
    .tl-time { font-size: 28rpx; font-weight: 500; color: var(--text-primary); }
    .tl-place { font-size: 26rpx; color: var(--text-secondary); }
    .tl-address { font-size: 22rpx; color: var(--text-tertiary); }
  }
}

.nav-btn {
  text-align: right; padding-top: 8rpx;
  text { font-size: 26rpx; color: var(--primary-color); }
}

/* 日志 */
.log-item {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--border-light);

  .log-dot {
    width: 14rpx; height: 14rpx; border-radius: 50%; background: var(--primary-color); margin-top: 8rpx; flex-shrink: 0;
  }
  .log-right {
    flex: 1; display: flex; flex-direction: column; gap: 4rpx;
    .log-action { font-size: 26rpx; color: var(--text-primary); }
    .log-detail { font-size: 22rpx; color: var(--text-tertiary); }
    .log-time { font-size: 22rpx; color: #bbb; }
  }
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: flex-end; gap: 16rpx;
  padding: 20rpx 24rpx;
  background: var(--bg-primary);
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);

  .action-btn {
    height: 72rpx; line-height: 72rpx;
    padding: 0 36rpx; border-radius: 36rpx;
    font-size: 28rpx;

    &.btn-outline {
      border: 1rpx solid var(--border-color); color: var(--text-secondary); background: transparent;
    }
    &.btn-primary {
      background: var(--primary-color); color: #fff; border: none;
    }
  }
}
</style>
