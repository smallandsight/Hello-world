<template>
  <view class="page-order-list">
    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="(tab, idx) in tabs"
        :key="idx"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="tab.value === currentTab" class="tab-indicator"></view>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="order-scroll" @scrolltolower="loadMore">
      <view v-if="loading && !list.length" class="loading-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="!list.length && !loading" class="empty-state">
        <image src="/static/images/empty-order.png" mode="aspectFit" style="width: 240rpx; height: 200rpx;" />
        <text class="empty-text">暂无订单</text>
        <button class="btn-go-rent" size="mini" @click="goRent">去租车</button>
      </view>

      <view v-else class="order-cards">
        <gy-order-card
          v-for="item in list"
          :key="item.id"
          :order="item"
          @click="goDetail($event)"
          @cancel="handleCancel($event)"
          @pickup="handlePickup($event)"
          @return="handleReturn($event)"
          @pay="handlePay($event)"
        />

        <!-- 加载更多提示 -->
        <view v-if="hasMore && list.length > 0" class="load-more">
          加载更多...
        </view>
        <view v-if="!hasMore && list.length > 0" class="no-more">
          — 没有更多了 —
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as orderApi from '@/api/order'
import type { OrderListItem } from '@/types/order'

// ==================== 数据 ====================

const tabs = [
  { label: '全部', value: '' },
  { label: '待支付', value: '10' },
  { label: '使用中', value: '30' },
  { label: '已完成', value: '60' },
]

const currentTab = ref('')
const list = ref<OrderListItem[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)

// ==================== 方法 ====================

onShow(() => {
  refreshList()
})

async function refreshList() {
  page.value = 1
  hasMore.value = true
  await fetchOrders()
}

async function fetchOrders() {
  loading.value = true
  try {
    const res = await orderApi.getOrderList({
      status: currentTab.value || undefined,
      page: page.value,
      pageSize,
    })

    if (page.value === 1) {
      list.value = res.data?.list || []
    } else {
      list.value.push(...(res.data?.list || []))
    }

    // 判断是否还有更多
    const total = res.data?.pagination?.total || 0
    hasMore.value = page.value * pageSize < total
  } catch (e) {
    console.error('获取订单列表失败:', e)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  fetchOrders()
}

function switchTab(value: string) {
  if (currentTab.value === value) return
  currentTab.value = value
  refreshList()
}

// ========== 操作处理 ==========

function goDetail(orderId: number) {
  uni.navigateTo({ url: `/pages/order/detail?id=${orderId}` })
}

function goRent() {
  uni.navigateTo({ url: '/pages/car/list' })
}

async function handleCancel(orderId: number) {
  const [err, res] = await uni.showModal({
    title: '确认取消',
    content: '确定要取消此订单吗？',
  })
  if (!res.confirm) return

  try {
    await orderApi.cancelOrder(orderId)
    uni.showToast({ title: '取消成功', icon: 'success' })
    refreshList()
  } catch (e) { /* 已在 request 中 toast */ }
}

async function handlePickup(orderId: number) {
  uni.navigateTo({ url: `/pages/order/pickup?orderId=${orderId}` })
}

async function handleReturn(orderId: number) {
  uni.navigateTo({ url: `/pages/order/return?orderId=${orderId}` })
}

async function handlePay(orderId: number) {
  uni.navigateTo({ url: `/pages/payment/index?orderId=${orderId}` })
}
</script>

<style lang="scss" scoped>
.page-order-list {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Tab 栏 */
.tabs {
  display: flex;
  background: var(--bg-primary);
  padding: 0 12rpx;
  border-bottom: 1rpx solid var(--border-light);

  .tab-item {
    flex: 1;
    text-align: center;
    position: relative;
    padding: 24rpx 0;

    text {
      font-size: 28rpx;
      color: var(--text-secondary);
    }

    &.active text { color: var(--primary-color); font-weight: 600; }

    .tab-indicator {
      position: absolute;
      bottom: 4rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: var(--primary-color);
      border-radius: 3rpx;
    }
  }
}

/* 滚动区域 */
.order-scroll {
  flex: 1;
  overflow-y: auto;
}

.order-cards {
  padding: 20rpx 24rpx;

  .gy-order-card + .gy-order-card {
    margin-top: 16rpx;
  }
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 160rpx;
  gap: 20rpx;

  .empty-text { font-size: 28rpx; color: var(--text-tertiary); }
  .btn-go-rent {
    margin-top: 20rpx;
    background: var(--primary-color);
    color: #fff;
    border-radius: 32rpx;
  }
}

.load-more, .no-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 24rpx;
  color: var(--text-tertiary);
}
</style>
