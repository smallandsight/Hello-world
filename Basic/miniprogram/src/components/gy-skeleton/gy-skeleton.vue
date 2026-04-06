<template>
  <view class="skeleton" :class="{ 'skeleton--animate': animate }">
    <!-- 列表骨架 -->
    <template v-if="type === 'list'">
      <view v-for="i in rows" :key="i" class="skeleton-item">
        <view class="skeleton-avatar"></view>
        <view class="skeleton-content">
          <view class="skeleton-title"></view>
          <view class="skeleton-text"></view>
          <view class="skeleton-text skeleton-text--short"></view>
        </view>
      </view>
    </template>

    <!-- 卡片骨架 -->
    <template v-else-if="type === 'card'">
      <view v-for="i in rows" :key="i" class="skeleton-card">
        <view class="skeleton-image"></view>
        <view class="skeleton-card-body">
          <view class="skeleton-title"></view>
          <view class="skeleton-text"></view>
          <view class="skeleton-footer">
            <view class="skeleton-tag"></view>
            <view class="skeleton-price"></view>
          </view>
        </view>
      </view>
    </template>

    <!-- 详情骨架 -->
    <template v-else-if="type === 'detail'">
      <view class="skeleton-banner"></view>
      <view class="skeleton-section">
        <view class="skeleton-title skeleton-title--lg"></view>
        <view class="skeleton-text"></view>
        <view class="skeleton-text skeleton-text--short"></view>
      </view>
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-grid">
          <view v-for="i in 4" :key="i" class="skeleton-grid-item"></view>
        </view>
      </view>
    </template>

    <!-- 订单骨架 -->
    <template v-else-if="type === 'order'">
      <view v-for="i in rows" :key="i" class="skeleton-order">
        <view class="skeleton-order-header">
          <view class="skeleton-order-no"></view>
          <view class="skeleton-order-status"></view>
        </view>
        <view class="skeleton-order-body">
          <view class="skeleton-image skeleton-image--small"></view>
          <view class="skeleton-order-info">
            <view class="skeleton-title"></view>
            <view class="skeleton-text"></view>
            <view class="skeleton-text skeleton-text--short"></view>
          </view>
        </view>
        <view class="skeleton-order-footer">
          <view class="skeleton-price"></view>
          <view class="skeleton-btn"></view>
        </view>
      </view>
    </template>

    <!-- 默认单行骨架 -->
    <template v-else>
      <view v-for="i in rows" :key="i" class="skeleton-row">
        <view class="skeleton-text" :style="{ width: randomWidth }"></view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 骨架类型 */
  type?: 'list' | 'card' | 'detail' | 'order' | 'default'
  /** 行数 */
  rows?: number
  /** 是否显示动画 */
  animate?: boolean
}>()

// 随机宽度
const randomWidth = computed(() => {
  const widths = ['60%', '70%', '80%', '90%']
  return widths[Math.floor(Math.random() * widths.length)]
})
</script>

<style lang="scss" scoped>
.skeleton {
  padding: 24rpx;

  &--animate {
    .skeleton-avatar,
    .skeleton-image,
    .skeleton-title,
    .skeleton-text,
    .skeleton-tag,
    .skeleton-price,
    .skeleton-btn,
    .skeleton-order-no,
    .skeleton-order-status,
    .skeleton-grid-item,
    .skeleton-banner {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// 基础元素
.skeleton-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.skeleton-image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background: #f0f0f0;

  &--small {
    width: 160rpx;
    height: 120rpx;
  }
}

.skeleton-title {
  height: 36rpx;
  width: 60%;
  border-radius: 8rpx;
  background: #f0f0f0;
  margin-bottom: 16rpx;

  &--lg {
    height: 48rpx;
    width: 80%;
  }
}

.skeleton-text {
  height: 28rpx;
  width: 100%;
  border-radius: 6rpx;
  background: #f0f0f0;
  margin-bottom: 12rpx;

  &--short {
    width: 60%;
  }
}

.skeleton-tag {
  height: 40rpx;
  width: 120rpx;
  border-radius: 20rpx;
  background: #f0f0f0;
}

.skeleton-price {
  height: 40rpx;
  width: 160rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.skeleton-btn {
  height: 60rpx;
  width: 160rpx;
  border-radius: 30rpx;
  background: #f0f0f0;
}

.skeleton-banner {
  width: 100%;
  height: 400rpx;
  border-radius: 16rpx;
  background: #f0f0f0;
  margin-bottom: 32rpx;
}

.skeleton-row {
  margin-bottom: 24rpx;
}

// 列表骨架
.skeleton-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  .skeleton-content {
    flex: 1;
    margin-left: 24rpx;
  }
}

// 卡片骨架
.skeleton-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  .skeleton-card-body {
    padding: 24rpx;
  }

  .skeleton-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24rpx;
  }
}

// 详情骨架
.skeleton-section {
  padding: 32rpx 0;
  border-bottom: 16rpx solid #f5f5f5;
}

.skeleton-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;
}

.skeleton-grid-item {
  width: 25%;
  height: 80rpx;
  margin-bottom: 24rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

// 订单骨架
.skeleton-order {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;

  .skeleton-order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }

  .skeleton-order-no {
    height: 28rpx;
    width: 200rpx;
    border-radius: 6rpx;
    background: #f0f0f0;
  }

  .skeleton-order-status {
    height: 40rpx;
    width: 120rpx;
    border-radius: 20rpx;
    background: #f0f0f0;
  }

  .skeleton-order-body {
    display: flex;
    padding: 24rpx 0;
  }

  .skeleton-order-info {
    flex: 1;
    margin-left: 24rpx;
  }

  .skeleton-order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20rpx;
    border-top: 1rpx solid #f0f0f0;
  }
}
</style>