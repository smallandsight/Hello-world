<template>
  <view class="feedback-page">
    <!-- 分类选择 -->
    <view class="category-section">
      <view class="section-label">反馈分类 *</view>
      <view class="category-list">
        <view
          v-for="cat in categories"
          :key="cat.value"
          class="category-item"
          :class="{ active: form.category === cat.value }"
          @click="form.category = cat.value"
        >
          <text class="cat-icon">{{ cat.icon }}</text>
          <text class="cat-name">{{ cat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 反馈内容 -->
    <view class="content-section">
      <view class="section-label">问题描述 *</view>
      <textarea
        v-model="form.content"
        class="fb-textarea"
        placeholder="请详细描述您遇到的问题或建议..."
        maxlength="1000"
        auto-height
      />
      <text class="char-count">{{ form.content.length }}/1000</text>
    </view>

    <!-- 图片上传 -->
    <view class="images-section">
      <view class="section-label">截图（选填，最多4张）</view>
      <view class="image-list">
        <view
          v-for="(img, index) in form.images"
          :key="index"
          class="image-preview"
        >
          <image :src="img" mode="aspectFill" class="preview-img" />
          <view class="remove-btn" @click="removeImage(index)">×</view>
        </view>
        <view
          v-if="form.images.length < 4"
          class="image-add"
          @click="chooseImage"
        >
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>

    <!-- 联系方式（可选） -->
    <view class="contact-section">
      <view class="section-label">联系方式（选填，方便我们联系您）</view>
      <input
        v-model="form.contact"
        class="contact-input"
        placeholder="手机号或微信号"
      />
    </view>

    <!-- 提交按钮 -->
    <view class="submit-bar">
      <button
        class="btn-submit"
        :disabled="submitting || !canSubmit"
        @click="submitFeedback"
      >
        {{ submitting ? '提交中...' : '提交反馈' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { createFeedback } from '@/api/feedback'

// ==================== 数据 ====================

const categories = [
  { value: 'bug', label: '功能异常', icon: '🐛' },
  { value: 'suggestion', label: '功能建议', icon: '💡' },
  { value: 'complaint', label: '投诉建议', icon: '📋' },
  { value: 'other', label: '其他', icon: '💬' },
]

const form = reactive({
  category: '',
  content: '',
  images: [] as string[],
  contact: '',
})

const submitting = ref(false)

const canSubmit = computed(() => {
  return form.category && form.content.trim().length >= 5
})

// ==================== 方法 ====================

function chooseImage() {
  uni.chooseImage({
    count: 4 - form.images.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      form.images.push(...res.tempFilePaths)
    },
  })
}

function removeImage(index: number) {
  form.images.splice(index, 1)
}

async function submitFeedback() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true

  try {
    await createFeedback({
      category: form.category,
      content: form.content.trim(),
      images: form.images.length > 0 ? form.images : undefined,
      contact: form.contact.trim() || undefined,
    })

    uni.showModal({
      title: '提交成功',
      content: '感谢您的反馈，我们会尽快处理！',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        uni.navigateBack()
      },
    })
  } catch (e) {
    console.error('提交反馈失败:', e)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.feedback-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 18rpx;
}

// 分类选择
.category-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 22rpx 12rpx;
  border-radius: 14rpx;
  border: 1rpx solid #eee;

  &.active {
    border-color: #1890ff;
    background: #e6f7ff;

    .cat-name {
      color: #1890ff;
    }
  }
}

.cat-icon {
  font-size: 36rpx;
}

.cat-name {
  font-size: 23rpx;
  color: #666;
}

// 内容输入
.content-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  position: relative;
}

.fb-textarea {
  width: 100%;
  min-height: 260rpx;
  padding: 16rpx;
  font-size: 27rpx;
  line-height: 1.65;
  color: #333;
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

// 图片上传
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

// 联系方式
.contact-section {
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.contact-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 27rpx;
}

// 提交栏
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
  background: linear-gradient(135deg, #52c41a, #389e0d);
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
