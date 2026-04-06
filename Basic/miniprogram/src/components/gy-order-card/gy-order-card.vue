<template>
  <view class="gy-order-card" @click="handleClick">
    <!-- 头部：订单号 + 状态 -->
    <view class="order-header">
      <text class="order-no">{{ order.orderNo || `订单${order.id}` }}</text>
      <text class="order-status" :class="statusClass">{{ order.statusText }}</text>
    </view>

    <!-- 车辆信息 -->
    <view class="order-body">
      <image
        class="vehicle-image"
        :src="order.vehicleImage || '/static/images/car-placeholder.png'"
        mode="aspectFill"
      />
      <view class="vehicle-info">
        <text class="vehicle-name">{{ order.vehicleName || '车辆' }}</text>
        <text class="store-name" v-if="order.storeName">{{ order.storeName }}</text>
        <text class="time-range">
          {{ formatDate(order.startTime) }}
          <text v-if="order.endTime"> ~ {{ formatDate(order.endTime) }}</text>
        </text>
      </view>
      <view class="amount-area">
        <text class="amount">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="order-actions" v-if="showActions && hasAnyAction">
      <button
        v-if="order.canPay"
        class="action-btn action-pay"
        size="mini"
        @click.stop="handlePay"
      >去支付</button>
      <button
        v-if="order.canCancel"
        class="action-btn action-cancel"
        size="mini"
        plain
        @click.stop="handleCancel"
      >取消</button>
      <button
        v-if="order.canPickup"
        class="action-btn action-primary"
        size="mini"
        type="primary"
        @click.stop="handlePickup"
      >取车</button>
      <button
        v-if="order.canReturn"
        class="action-btn action-primary"
        size="mini"
        type="primary"
        @click.stop="handleReturn"
      >还车</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { OrderListItem, Order } from '@/types/order'
import { ORDER_STATUS_CLASS } from '@/types/order'
import { computed } from 'vue'
import { formatDateShort } from '@/utils/format'

interface Props {
  order: OrderListItem | Order
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
})

const emit = defineEmits<{
  click: [orderId: number]
  cancel: [orderId: number]
  pickup: [orderId: number]
  return: [orderId: number]
  pay: [orderId: number]
}>()

const statusClass = computed(() =>
  ORDER_STATUS_CLASS[props.order.status] ?? 'status-default',
)

const hasAnyAction = computed(
  () => props.order.canPay || props.order.canCancel || props.order.canPickup || props.order.canReturn,
)

function formatDate(d: string) {
  if (!d) return ''
  // 只显示 MM-DD HH:mm
  const date = new Date(d)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleClick = () => emit('click', props.order.id)
const handleCancel = () => emit('cancel', props.order.id)
const handlePickup = () => emit('pickup', props.order.id)
const handleReturn = () => emit('return', props.order.id)
const handlePay = () => emit('pay', props.order.id)
</script>

<style lang="scss" scoped>
.gy-order-card {
  background: var(--bg-primary);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    transform: scale(0.99);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .order-no {
      font-size: 24rpx;
      color: var(--text-tertiary);
    }

    .order-status {
      font-size: 26rpx;
      font-weight: 600;

      &.status-warning { color: #faad14; }
      &.status-primary { color: var(--primary-color); }
      &.status-success { color: #52c41a; }
      &.status-info { color: var(--primary-light); }
      &.status-default { color: var(--text-secondary); }
      &.status-muted { color: var(--text-tertiary); }
      &.status-danger { color: #f5222d; }
    }
  }

  .order-body {
    display: flex;
    gap: 20rpx;

    .vehicle-image {
      width: 160rpx;
      height: 120rpx;
      border-radius: 12rpx;
      background: #f5f5f5;
      flex-shrink: 0;
    }

    .vehicle-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .vehicle-name {
        font-size: 28rpx;
        font-weight: 600;
        color: var(--text-primary);
      }
      .store-name {
        font-size: 24rpx;
        color: var(--text-tertiary);
        margin-top: 6rpx;
      }
      .time-range {
        font-size: 22rpx;
        color: var(--text-tertiary);
        margin-top: 6rpx;
      }
    }

    .amount-area {
      display: flex;
      align-items: center;

      .amount {
        font-size: 32rpx;
        font-weight: bold;
        color: #f5222d;
      }
    }
  }

  .order-actions {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid var(--border-light);

    .action-btn {
      font-size: 24rpx !important;
      border-radius: 32rpx !important;
      padding: 0 24rpx !important;
      height: 56rpx !important;
      line-height: 56rpx !important;

      &.action-cancel {
        color: var(--text-secondary) !important;
        border-color: var(--border-color) !important;
      }
      &.action-pay {
        background: linear-gradient(135deg, #1890ff, #096dd9) !important;
        color: #fff !important;
        border: none !important;
      }
      &.action-primary {
        background: var(--primary-color) !important;
        color: #fff !important;
      }
    }
  }
}
</style>
