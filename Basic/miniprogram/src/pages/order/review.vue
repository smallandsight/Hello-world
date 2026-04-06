<template>
  <view class="review-page">
    <!-- 评分区域 -->
    <view class="rating-section">
      <text class="section-label">您的评分</text>
      <view class="star-row">
        <view
          v-for="i in 5"
          :key="i"
          class="star-item"
          @click="rating = i"
        >
          <text
            class="star-icon"
            :class="{ active: i <= rating, half: false }"
          >★</text>
        </view>
        <text class="rating-text">{{ ratingTexts[rating - 1] }}</text>
      </view>
    </view>

    <!-- 标签选择 -->
    <view class="tags-section">
      <text class="section-label">评价标签（可多选）</text>
      <view class="tag-list">
        <view
          v-for="tag in availableTags"
          :key="tag"
          class="tag-item"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- 文字评价 -->
    <view class="content-section">
      <text class="section-label">详细评价（选填）</text>
      <textarea
        v-model="content"
        class="review-textarea"
        placeholder="说说这次租车的体验吧~"
        maxlength="500"
        auto-height
      />
      <text class="char-count">{{ content.length }}/500</text>
    </view>

    <!-- 图片上传 -->
    <view class="images-section">
      <text class="section-label">晒图（最多3张）</text>
      <view class="image-list">
        <view
          v-for="(img, index) in images"
          :key="index"
          class="image-preview"
        >
          <image :src="img" mode="aspectFill" class="preview-img" />
          <view class="remove-btn" @click="removeImage(index)">×</view>
        </view>
        <view
          v-if="images.length < 3"
          class="image-add"
          @click="chooseImage"
        >
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-bar">
      <button
        class="btn-submit"
        :disabled="submitting || !canSubmit"
        @click="submitReview"
      >
        {{ submitting ? '提交中...' : '发布评价' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createReview } from '@/api/review'

// ==================== 状态 ====================

const orderId = ref(0)
const vehicleId = ref(0)
const rating = ref(5)
const selectedTags = ref<string[]>([])
const content = ref('')
const images = ref<string[]>([])
const submitting = ref(false)

// 评分文案
const ratingTexts = ['非常差', '不满意', '一般', '满意', '非常满意']

// 可用标签
const availableTags = [
  '干净整洁', '好开省油', '空间大', '动力足', '内饰新',
  'GPS好用', '取车方便', '服务态度好', '性价比高',
]

// 是否可以提交
const canSubmit = computed(() => {
  return orderId.value > 0 && vehicleId.value > 0 && rating.value >= 1
})

// ==================== 方法 ====================

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tag)
}

function chooseImage() {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
    },
  })
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

async function submitReview() {
  if (!canSubmit.value || submitting.value) return

  // 上传图片（实际项目中应先调OSS上传接口）
  // 这里简化处理，假设图片已上传返回URL
  const imageUrls = images.value // TODO: 实际需先上传到OSS

  submitting.value = true

  try {
    await createReview({
      orderId: orderId.value,
      vehicleId: vehicleId.value,
      rating: rating.value,
      content: content.value.trim() || undefined,
      tags: selectedTags.value.length > 0 ? selectedTags.value : undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    })

    uni.showToast({ title: '评价成功，感谢分享！', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('提交评价失败:', e)
  } finally {
    submitting.value = false
  }
}

// ==================== 生命周期 ====================

onLoad((query) => {
  if (query?.orderId) orderId.value = Number(query.orderId)
  if (query?.vehicleId) vehicleId.value = Number(query.vehicleId)
})
</script>

<style lang="scss" scoped>
.review-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24rpx;
  padding-bottom: 140rpx; // 为底部按钮留空
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

// 评分
.rating-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.star-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.star-item {
  padding: 8rpx;
}

.star-icon {
  font-size: 56rpx;
  color: #e0e0e0;

  &.active {
    color: #faad14;
  }
}

.rating-text {
  margin-left: 16rpx;
  font-size: 27rpx;
  color: #666;
}

// 标签
.tags-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 14rpx 28rpx;
  border-radius: 30rpx;
  font-size: 25rpx;
  color: #666;
  border: 1rpx solid #ddd;

  &.active {
    color: #1890ff;
    border-color: #1890ff;
    background: #e6f7ff;
  }
}

// 文字评价
.content-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  position: relative;
}

.review-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  font-size: 27rpx;
  color: #333;
  line-height: 1.6;
  box-sizing: border-box;
  background: #fafafa;
  border-radius: 10rpx;
}

.char-count {
  position: absolute;
  right: 32rpx;
  bottom: 24rpx;
  font-size: 23rpx;
  color: #bbb;
}

// 图片
.images-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-preview {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.preview-img {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 34rpx;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 50%;
  font-size: 24rpx;
}

.image-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ccc;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  font-size: 56rpx;
  color: #ccc;
}

// 底部按钮
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;

  &[disabled] {
    opacity: 0.45;
  }

  &::after {
    display: none;
  }
}
</style>
