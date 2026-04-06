<template>
  <view class="gy-car-card" @click="handleClick">
    <!-- 车辆图片 -->
    <image
      class="car-image"
      :src="vehicle.image || '/static/images/car-placeholder.png'"
      mode="aspectFill"
    />
    <!-- 车辆信息 -->
    <view class="car-info">
      <view class="car-header">
        <text class="car-name text-ellipsis">{{ vehicle.brand }} {{ vehicle.model }}</text>
        <view class="car-tags" v-if="vehicle.vehicleTypeText || vehicle.seatCount">
          <text v-if="vehicle.vehicleTypeText" class="tag tag-type">{{ vehicle.vehicleTypeText }}</text>
          <text v-if="vehicle.seatCount" class="tag tag-seat">{{ vehicle.seatCount }}座</text>
          <text v-if="vehicle.transmissionText" class="tag">{{ vehicle.transmissionText }}</text>
        </view>
      </view>
      <view class="car-footer">
        <view class="price-row">
          <text class="price-symbol">¥</text>
          <text class="price-amount">{{ formatDailyRate(vehicle.dailyRate) }}</text>
          <text class="price-unit">/天</text>
        </view>
        <view class="store-info" v-if="vehicle.storeName">
          <text class="store-name text-ellipsis">{{ vehicle.storeName }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { VehicleListItem } from '@/types/vehicle'
import { formatMoneyYuan } from '@/utils/format'

interface Props {
  vehicle: VehicleListItem
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [vehicleId: number]
}>()

const handleClick = () => emit('click', props.vehicle.id)

const formatDailyRate = (rate: number) => (rate / 100).toFixed(0)
</script>

<style lang="scss" scoped>
.gy-car-card {
  display: flex;
  background: var(--bg-primary);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;

  &:active {
    transform: scale(0.98);
  }

  .car-image {
    width: 220rpx;
    height: 180rpx;
    flex-shrink: 0;
    background: #f0f0f0;
  }

  .car-info {
    flex: 1;
    padding: 20rpx 24rpx 16rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .car-header {
      .car-name {
        font-size: 30rpx;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
      }

      .car-tags {
        margin-top: 10rpx;
        display: flex;
        gap: 8rpx;
        flex-wrap: wrap;

        .tag {
          font-size: 20rpx;
          padding: 2rpx 12rpx;
          border-radius: 6rpx;
          background: #e6f7ff;
          color: var(--primary-color);

          &.tag-type {
            background: #f0f5ff;
            color: #597ef7;
          }
          &.tag-seat {
            background: #fff7e6;
            color: #fa8c16;
          }
        }
      }
    }

    .car-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;

      .price-row {
        display: flex;
        align-items: baseline;

        .price-symbol {
          font-size: 24rpx;
          color: #f5222d;
          font-weight: bold;
        }
        .price-amount {
          font-size: 36rpx;
          color: #f5222d;
          font-weight: bold;
          line-height: 1;
        }
        .price-unit {
          font-size: 22rpx;
          color: var(--text-tertiary);
          margin-left: 4rpx;
        }
      }

      .store-name {
        font-size: 22rpx;
        color: var(--text-tertiary);
        max-width: 200rpx;
      }
    }
  }
}
</style>
