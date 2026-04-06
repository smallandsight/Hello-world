<template>
  <view class="gy-review-summary">
    <!-- 综合评分 -->
    <view class="summary-header">
      <view class="score-circle">
        <text class="score-value">{{ averageRating > 0 ? averageRating.toFixed(1) : '-' }}</text>
        <text class="score-label">综合评分</text>
      </view>
      <view class="distribution">
        <view
          v-for="(count, star) in distributionBars"
          :key="star"
          class="dist-row"
        >
          <text class="dist-star">{{ star }}星</text>
          <view class="dist-track">
            <view
              class="dist-fill"
              :style="{ width: getDistWidth(star, count) + '%' }"
            />
          </view>
          <text class="dist-count">{{ count }}</text>
        </view>
      </view>
    </view>

    <!-- 总评价数提示 -->
    <view class="summary-footer">
      共 {{ totalCount }} 条评价
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import type { ReviewSummary } from '@/types/extended'

const props = defineProps<{
  summary?: ReviewSummary | null
}>()

const averageRating = computed(() => props.summary?.averageRating ?? 0)

const totalCount = computed(() => props.summary?.totalCount ?? 0)

// 星级分布数据
const distributionBars = computed(() => {
  const dist = props.summary?.distribution || {}
  return [
    { star: 5, count: dist[5] || 0 },
    { star: 4, count: dist[4] || 0 },
    { star: 3, count: dist[3] || 0 },
    { star: 2, count: dist[2] || 0 },
    { star: 1, count: dist[1] || 0 },
  ]
})

function getDistWidth(star: number, count: number): number {
  const total = totalCount.value
  if (!total) return 0
  return Math.round((count / total) * 100)
}
</script>

<style lang="scss" scoped>
.gy-review-summary {
  padding: 28rpx;
  background: #fff;
  border-radius: 14rpx;
  margin-bottom: 20rpx;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 36rpx;
}

.score-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #faad14 0%, #ffa940 50%, #ffc53d 100%);
  flex-shrink: 0;
}

.score-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}

.score-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4rpx;
}

.distribution {
  flex: 1;
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 7rpx 0;
}

.dist-star {
  font-size: 23rpx;
  color: #888;
  width: 52rpx;
  flex-shrink: 0;
}

.dist-track {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  background: #faad14;
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.dist-count {
  font-size: 23rpx;
  color: #999;
  width: 42rpx;
  text-align: right;
  flex-shrink: 0;
}

.summary-footer {
  text-align: center;
  padding-top: 18rpx;
  border-top: 1rpx solid #f5f5f5;
  font-size: 23rpx;
  color: #bbb;
}
</style>
