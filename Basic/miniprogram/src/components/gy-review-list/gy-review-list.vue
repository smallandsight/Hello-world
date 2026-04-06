<template>
  <view class="gy-review-list">
    <view v-if="reviews.length === 0 && !loading" class="empty-state">
      <text>暂无评价，快来发表第一条吧~</text>
    </view>

    <scroll-view
      scroll-y
      class="review-scroll"
      @scrolltolower="$emit('loadmore')"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="$emit('refresh')"
    >
      <view v-for="item in reviews" :key="item.id" class="review-card">
        <!-- 用户信息行 -->
        <view class="user-row">
          <image
            :src="item.userAvatar || '/static/icons/default-avatar.png'"
            class="avatar"
            mode="aspectFill"
          />
          <view class="user-info">
            <text class="username">{{ item.userName || '匿名用户' }}</text>
            <view class="rating-stars">
              <text
                v-for="s in 5"
                :key="s"
                class="mini-star"
                :class="{ filled: s <= item.rating }"
              >★</text>
            </view>
          </view>
          <text class="review-time">{{ formatRelativeTime(item.createdAt) }}</text>
        </view>

        <!-- 文字内容 -->
        <text v-if="item.content" class="review-content">{{ item.content }}</text>

        <!-- 标签 -->
        <view v-if="item.tags && item.tags.length" class="tags-row">
          <text v-for="tag in item.tags" :key="tag" class="review-tag">{{ tag }}</text>
        </view>

        <!-- 图片 -->
        <scroll-view
          v-if="item.images && item.images.length"
          scroll-x
          class="images-scroll"
        >
          <view class="images-inner">
            <image
              v-for="(img, idx) in item.images"
              :key="idx"
              :src="img"
              class="review-img"
              mode="aspectFill"
              @click="previewImages(item.images, idx)"
            />
          </view>
        </scroll-view>

        <!-- 商家回复 -->
        <view v-if="item.replyContent" class="reply-block">
          <text class="reply-label">商家回复：</text>
          <text class="reply-text">{{ item.replyContent }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import type { Review } from '@/types/extended'

defineProps<{
  reviews: Review[]
  loading?: boolean
  refreshing?: boolean
}>()

defineEmits<{
  loadmore: []
  refresh: []
}>()

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 30) return `${diffDay}天前`

  // 超过30天显示日期
  const dt = new Date(dateStr)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function previewImages(images: string[], current: number) {
  uni.previewImage({
    urls: images,
    current: String(current),
  })
}
</script>

<style lang="scss" scoped>
.gy-review-list {
  // ...
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: #999;
}

.review-scroll {
  max-height: 1200rpx;
}

.review-card {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:first-child {
    padding-top: 0;
  }
}

.user-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #eee;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.username {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.rating-stars {
  .mini-star {
    font-size: 22rpx;
    color: #e0e0e0;

    &.filled {
      color: #faad14;
    }
  }
}

.review-time {
  font-size: 22rpx;
  color: #bbb;
}

.review-content {
  display: block;
  margin-top: 14rpx;
  font-size: 27rpx;
  color: #555;
  line-height: 1.65;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.review-tag {
  padding: 6rpx 16rpx;
  background: #f5f5f5;
  color: #888;
  font-size: 22rpx;
  border-radius: 6rpx;
}

.images-scroll {
  white-space: nowrap;
  margin-top: 14rpx;
}

.images-inner {
  display: inline-flex;
  gap: 12rpx;
}

.review-img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 10rpx;
}

.reply-block {
  margin-top: 16rpx;
  padding: 18rpx;
  background: #fafafa;
  border-radius: 10rpx;
  border-left: 4rpx solid #1890ff;
}

.reply-label {
  font-size: 23rpx;
  color: #1890ff;
  font-weight: 500;
}

.reply-text {
  font-size: 25rpx;
  color: #666;
  line-height: 1.5;
}
</style>
