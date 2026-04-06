<template>
  <view class="gy-fee-detail">
    <!-- 标题 -->
    <view class="fee-header" @click="toggleExpand" v-if="collapsible">
      <text class="title">{{ title }}</text>
      <text class="expand-icon">{{ isExpanded ? '收起' : '展开' }} ▼</text>
    </view>

    <!-- 费用列表 -->
    <view class="fee-list" v-show="isExpanded || !collapsible">
      <view class="fee-item" v-for="(item, idx) in items" :key="idx">
        <text class="fee-label">{{ item.label }}</text>
        <text class="fee-value" :class="{ discount: item.isDiscount }">
          {{ item.isDiscount ? '-' : '' }}{{ item.value }}
        </text>
      </view>

      <!-- 分割线 -->
      <view class="divider" v-if="items.length"></view>

      <!-- 合计 -->
      <view class="fee-total">
        <text class="total-label">合计</text>
        <text class="total-value">¥{{ totalDisplay }}</text>
      </view>
    </view>

    <!-- 押金区域（可选） -->
    <view class="deposit-area" v-if="showDeposit && depositAmount">
      <view class="deposit-item">
        <text class="deposit-label">押金（可退）</text>
        <text class="deposit-value">¥{{ (depositAmount / 100).toFixed(2) }}</text>
      </view>
      <view class="deposit-item" v-if="violationDeposit">
        <text class="deposit-label">违章押金（可退）</text>
        <text class="deposit-value">¥{{ (violationDeposit / 100).toFixed(2) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FeeDetail } from '@/types/order'

export interface FeeItem {
  label: string
  value: string
  isDiscount?: boolean
}

interface Props {
  /** 标题 */
  title?: string
  /** 费用明细对象 */
  fee?: FeeDetail | null
  /** 手动传入费用项 */
  items?: FeeItem[]
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认展开 */
  defaultExpanded?: boolean
  /** 是否显示押金 */
  showDeposit?: boolean
  depositAmount?: number
  violationDeposit?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '费用明细',
  collapsible: true,
  defaultExpanded: false,
  showDeposit: true,
  depositAmount: 0,
  violationDeposit: 0,
})

const isExpanded = ref(props.defaultExpanded)

/** 自动生成 items 列表（从 fee 对象） */
const autoItems = computed<FeeItem[]>(() => {
  if (!props.fee) return []
  const f = props.fee
  const list: FeeItem[] = []

  if (f.rentalFee) list.push({ label: `租金(${f.rentalDays}天)`, value: `¥${(f.rentalFee / 100).toFixed(2)}` })
  if (f.insuranceFee) list.push({ label: '保险费', value: `¥${(f.insuranceFee / 100).toFixed(2)}` })
  if (f.serviceFee) list.push({ label: '服务费', value: `¥${(f.serviceFee / 100).toFixed(2)}` })
  if (f.overtimeFee && f.overtimeFee > 0) list.push({ label: '超时费', value: `¥${(f.overtimeFee / 100).toFixed(2)}` })
  if (f.couponDiscount && f.couponDiscount > 0) list.push({ label: '优惠券抵扣', value: `¥${(f.couponDiscount / 100).toFixed(2)}`, isDiscount: true })

  return list
})

const displayItems = computed(() => props.items || autoItems.value)

const totalDisplay = computed(() => {
  if (props.fee) return ((props.fee.totalFee ?? 0) / 100).toFixed(2)
  // 从 items 中无法计算，返回空
  return '--'
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<style lang="scss" scoped>
.gy-fee-detail {
  background: var(--bg-primary);
  border-radius: 16rpx;
  padding: 24rpx;

  .fee-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;

    .title {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
    .expand-icon {
      font-size: 22rpx;
      color: var(--text-tertiary);
    }
  }

  .fee-list {
    margin-top: 16rpx;
  }

  .fee-item {
    display: flex;
    justify-content: space-between;
    padding: 10rpx 0;
    font-size: 26rpx;

    .fee-label { color: var(--text-secondary); }
    .fee-value { color: var(--text-primary); }
    .discount { color: var(--success-color); }
  }

  .divider {
    height: 1rpx;
    background: var(--border-light);
    margin: 12rpx 0;
  }

  .fee-total {
    display: flex;
    justify-content: space-between;
    padding-top: 12rpx;

    .total-label {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--text-primary);
    }
    .total-value {
      font-size: 34rpx;
      font-weight: bold;
      color: #f5222d;
    }
  }

  .deposit-area {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx dashed var(--border-color);

    .deposit-item {
      display: flex;
      justify-content: space-between;
      padding: 8rpx 0;
      font-size: 24rpx;

      .deposit-label { color: var(--text-tertiary); }
      .deposit-value { color: var(--text-secondary); }
    }
  }
}
</style>
