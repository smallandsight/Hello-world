<template>
  <view class="wallet-tx-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-list">
          <view
            v-for="item in typeFilters"
            :key="item.value"
            class="filter-tag"
            :class="{ active: currentFilter === item.value }"
            @click="currentFilter = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 流水列表 -->
    <scroll-view
      scroll-y
      class="tx-list-scroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="tx-list">
        <!-- 日期分组 -->
        <view v-for="(group, gIndex) in groupedByDate" :key="gIndex">
          <view class="date-header">
            <text>{{ group.date }}</text>
            <text class="date-summary">
              支出 ¥{{ group.expense.toFixed(2) }} | 收入 ¥{{ group.income.toFixed(2) }}
            </text>
          </view>
          <view
            v-for="(item, index) in group.items"
            :key="index"
            class="tx-item"
          >
            <view class="tx-left">
              <view
                class="tx-dot"
                :style="{ background: getTxColor(item.type) }"
              />
              <view class="tx-info">
                <text class="tx-remark">{{ item.remark || getTypeName(item.type) }}</text>
                <text class="tx-time">{{ formatTimeFull(item.createdAt) }}</text>
              </view>
            </view>
            <text
              class="tx-amount"
              :class="item.amount >= 0 ? 'in' : 'out'"
            >
              {{ item.amount >= 0 ? '+' : '' }}{{ (item.amount / 100).toFixed(2) }}
            </text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMore" class="load-more">
          <text>加载中...</text>
        </view>
        <view v-else-if="page > 1" class="no-more">
          <text>— 没有更多了 —</text>
        </view>
      </view>

      <!-- 空 -->
      <view v-else-if="!loading" class="empty-state">
        <image src="/static/icons/empty-wallet.png" mode="aspectFit" class="empty-img" />
        <text class="empty-text">暂无交易记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getWalletTransactions } from '@/api/wallet'
import type { WalletTransaction, TransactionType } from '@/types/extended'

// ==================== 状态 ====================

const list = ref<WalletTransaction[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)
const currentFilter = ref('')

// 筛选类型
const typeFilters = [
  { label: '全部', value: '' },
  { label: '充值', value: 'RECHARGE' },
  { label: '支付', value: 'PAY' },
  { label: '退款', value: 'REFUND' },
  { label: '违章', value: 'DEDUCTION' },
]

// 按日期分组
interface DateGroup {
  date: string
  items: WalletTransaction[]
  income: number
  expense: number
}

const groupedByDate = computed<DateGroup[]>(() => {
  const filtered =
    !currentFilter.value
      ? list.value
      : list.value.filter((t) => t.type === (currentFilter.value as TransactionType))

  const map = new Map<string, DateGroup>()

  for (const item of filtered) {
    const d = new Date(item.createdAt)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (!map.has(dateKey)) {
      map.set(dateKey, { date: dateKey, items: [], income: 0, expense: 0 })
    }
    const group = map.get(dateKey)!
    group.items.push(item)

    const amt = item.amount / 100
    if (item.amount >= 0) group.income += amt
    else group.expense += Math.abs(amt)
  }

  return Array.from(map.values())
})

// ==================== 方法 ====================

async function loadData(reset = false) {
  if (loading.value) return

  loading.value = true
  if (reset) {
    page.value = 1
    hasMore.value = true
  }

  try {
    const res = await getWalletTransactions({
      page: page.value,
      size: pageSize,
    })

    const newList = res.data?.list || []
    if (reset) list.value = newList
    else list.value = [...list.value, ...newList]

    // 判断是否还有更多
    const total = res.data?.total || 0
    hasMore.value = list.value.length < total
    page.value++
  } catch (e) {
    console.error('加载交易流水失败:', e)
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

function getTypeName(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: '账户充值',
    PAY: '订单支付',
    REFUND: '退款到账',
    DEDUCTION: '违章扣除',
    REBATE: '违章退还',
  }
  return map[type] || '其他变动'
}

function getTxColor(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: '#52c41a',
    PAY: '#ff4d4f',
    REFUND: '#1890ff',
    DEDUCTION: '#faad14',
    REBATE: '#722ed1',
  }
  return map[type] || '#bbb'
}

function formatTimeFull(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ==================== 生命周期 ====================

onShow(() => {
  loadData(true)
})
</script>

<style lang="scss" scoped>
.wallet-tx-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  background: #fff;
  padding: 20rpx 24rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: inline-flex;
  gap: 16rpx;
}

.filter-tag {
  display: inline-block;
  padding: 12rpx 28rpx;
  font-size: 25rpx;
  color: #666;
  border-radius: 30rpx;
  background: #f5f5f5;

  &.active {
    color: #1890ff;
    background: #e6f7ff;
    font-weight: 500;
  }
}

.tx-list-scroll {
  flex: 1;
  height: calc(100vh - 88rpx);
}

.tx-list {
  padding: 0 24rpx;
}

.date-header {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 8rpx 8rpx;
  font-size: 25rpx;
  color: #999;
  position: sticky;
  top: 0;
  background: #f5f7fa;
}

.date-summary {
  color: #bbb;
  font-size: 22rpx;
}

.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 8rpx;
  background: #fff;
  margin-bottom: 1rpx;
  border-radius: 12rpx;
}

.tx-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.tx-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.tx-remark {
  font-size: 27rpx;
  color: #333;
  display: block;
}

.tx-time {
  font-size: 23rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.tx-amount {
  font-size: 29rpx;
  font-weight: 600;

  &.in {
    color: #52c41a;
  }

  &.out {
    color: #333;
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
  padding-top: 160rpx;
}

.empty-img {
  width: 200rpx;
  height: 200rpx;
  opacity: 0.4;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #999;
}
</style>
