<template>
  <view class="page-coupon">
    <!-- Tab: 可用 / 已使用 / 已过期 -->
    <view class="tabs">
      <view
        v-for="(tab, idx) in tabs"
        :key="idx"
        :class="['tab-item', { active: currentTab === tab.value }]"
        @click="switchTab(tab.value)"
      >{{ tab.label }}</view>
    </view>

    <scroll-view scroll-y class="coupon-scroll" @scrolltolower="loadMore">
      <view v-if="loading && !coupons.length" class="empty">加载中...</view>
      <view v-else-if="!coupons.length && !loading" class="empty">
        <text>暂无{{ currentTabName }}优惠券</text>
      </view>

      <view v-for="(c, idx) in coupons" :key="idx" class="coupon-card">
        <view class="c-left" :class="{ used: c.status === 'used', expired: c.status === 'expired' }">
          <text class="c-value">{{ formatValue(c) }}</text>
          <text class="c-condition">满{{ (c.minAmount / 100).toFixed(0) }}元可用</text>
          <text v-if="c.status === 'used'" class="c-status-text">已使用</text>
          <text v-if="c.status === 'expired'" class="c-status-text">已过期</text>
        </view>
        <view class="c-right">
          <text class="c-name">{{ c.name }}</text>
          <text class="c-valid">{{ formatDate(c.validFrom) }} ~ {{ formatDate(c.validTo) }}</text>
          <button
            v-if="c.status === 'available'"
            class="btn-use"
            size="mini"
            @click="useCoupon(c)"
          >立即使用</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as couponApi from '@/api/coupon'
import type { UserCoupon } from '@/types/coupon'
import { formatDate } from '@/utils/format'

const tabs = [
  { label: '可用', value: 'available' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]
const currentTab = ref('available')
const coupons = ref<UserCoupon[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)

const currentTabName = computed(() => tabs.find(t => t.value === currentTab.value)?.label || '')

onShow(() => refreshList())

async function refreshList() {
  page.value = 1; hasMore.value = true; await fetchCoupons()
}
async function fetchCoupons() {
  loading.value = true
  try {
    const res = await couponApi.getUserCoupons(currentTab.value, page.value, 20)
    if (page.value === 1) coupons.value = res.data?.list || []
    else coupons.value.push(...(res.data?.list || []))
    const total = res.data?.pagination?.total ?? 0; hasMore.value = page.value * 20 < total
  } catch {} finally { loading.value = false }
}
function loadMore() { if (!hasMore.value || loading.value) return; page.value++; fetchCoupons() }

function switchTab(val: string) {
  if (val === currentTab.value) return; currentTab.value = val; refreshList()
}

function formatValue(c: UserCoupon): string {
  return c.discountType === 'fixed'
    ? `¥${(c.value / 100).toFixed(0)}`
    : `${c.value}折`
}

function useCoupon(c: UserCoupon) {
  uni.showToast({ title: '请在下单时选择此优惠券', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.tabs { display: flex; background: var(--bg-primary); padding: 0 12rpx;
  .tab-item { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: var(--text-secondary); position: relative;
    &.active { color: var(--primary-color); font-weight: 600;
      &::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: var(--primary-color); border-radius: 2rpx; }
    }
  }
}
.coupon-scroll { flex: 1; height: calc(100vh - 200rpx); }
.coupon-card { display: flex; margin: 20rpx 24rpx; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  .c-left {
    width: 220rpx; padding: 30rpx 24rpx; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6rpx; background: linear-gradient(135deg, #f5222d, #cf1322); color: #fff;
    &.used { background: #bfbfbf; } &.expired { background: #d9d9d9; }
    .c-value { font-size: 48rpx; font-weight: bold; line-height: 1; }
    .c-condition { font-size: 20rpx; opacity: 0.8; }
    .c-status-text { font-size: 24rpx; font-weight: bold; }
  }
  .c-right { flex: 1; padding: 24rpx; background: var(--bg-primary); display: flex; flex-direction: column; justify-content: center; gap: 10rpx;
    .c-name { font-size: 28rpx; font-weight: 600; color: var(--text-primary); }
    .c-valid { font-size: 22rpx; color: var(--text-tertiary); }
    .btn-use { width: 140rpx; height: 56rpx; line-height: 56rpx; text-align: center; background: linear-gradient(135deg, #1890ff, #096dd9); color: #fff; border-radius: 28rpx; font-size: 24rpx; border: none; margin-top: 8rpx; align-self: flex-start; }
  }
}
.empty { text-align: center; padding-top: 160rpx; font-size: 28rpx; color: var(--text-tertiary); }
</style>
