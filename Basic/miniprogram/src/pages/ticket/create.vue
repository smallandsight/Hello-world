<template>
  <view class="create-ticket-page">
    <!-- 分类选择 -->
    <view class="section-block">
      <view class="section-label">选择分类 *</view>
      <view class="cat-grid">
        <view
          v-for="cat in categories"
          :key="cat.value"
          class="cat-card"
          :class="{ active: form.category === cat.value }"
          @click="form.category = cat.value"
        >
          <text class="cat-icon">{{ cat.icon }}</text>
          <text class="cat-name">{{ cat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 关联订单（可选） -->
    <view class="section-block">
      <view class="section-label">关联订单（选填，方便我们快速定位问题）</view>
      <input
        v-model="form.orderNo"
        class="form-input"
        placeholder="请输入订单号"
      />
    </view>

    <!-- 标题 -->
    <view class="section-block">
      <view class="section-label">问题标题 *</view>
      <input
        v-model="form.title"
        class="form-input"
        placeholder="一句话描述您的问题"
        maxlength="50"
      />
    </view>

    <!-- 详细描述 -->
    <view class="section-block">
      <view class="section-label">详细描述 *</view>
      <textarea
        v-model="form.content"
        class="desc-textarea"
        placeholder="请尽可能详细地说明问题发生的经过、现象等..."
        maxlength="2000"
        auto-height
      />
      <text class="char-count">{{ form.content.length }}/2000</text>
    </view>

    <!-- 图片上传 -->
    <view class="section-block">
      <view class="section-label">截图/凭证（选填，最多5张）</view>
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
          v-if="form.images.length < 5"
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
        @click="handleSubmit"
      >
        {{ submitting ? '提交中...' : '提交工单' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { createTicket } from '@/api/ticket'

// ==================== 数据 ====================
const categories = [
  { value: 'order_issue', label: '订单问题', icon: '📋' },
  { value: 'payment', label: '支付纠纷', icon: '💰' },
  { value: 'vehicle', label: '车辆问题', icon: '🚗' },
  { value: 'refund', label: '退款申请', icon: '↩️' },
  { value: 'account', label: '账号问题', icon: '👤' },
  { value: 'suggestion', label: '建议投诉', icon: '💡' },
  { value: 'accident', label: '事故纠纷', icon: '⚠️' },
  { value: 'other', label: '其他', icon: '📝' },
]

const form = reactive({
  category: '',
  orderNo: '',
  title: '',
  content: '',
  images: [] as string[],
})

const submitting = ref(false)

const canSubmit = computed(() => {
  return form.category && form.title.trim() && form.content.trim().length >= 10
})

// ==================== 方法 ====================
function chooseImage() {
  uni.chooseImage({
    count: 5 - form.images.length,
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

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true

  try {
    await createTicket({
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      images: form.images.length > 0 ? form.images : undefined,
      // TODO: 如果填了orderNo需要转为orderId
    })

    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('提交工单失败:', e)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.create-ticket-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.section-block {
  padding: 28rpx;
  background: #fff;
  border-radius: 14rpx;
  margin-bottom: 18rpx;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 18rpx;
}

// 分类网格
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14rpx;
}

.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 10rpx;
  border-radius: 12rpx;
  border: 1rpx solid #eee;

  &.active {
    border-color: #1890ff;
    background: #e6f7ff;

    .cat-name { color: #1890ff; }
  }
}

.cat-icon {
  font-size: 34rpx;
}

.cat-name {
  font-size: 22rpx;
  color: #666;
}

.form-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 27rpx;
}

.desc-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 16rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 27rpx;
  line-height: 1.65;
  color: #333;
  box-sizing: border-box;
  background: #fafafa;
  position: relative;
}

.char-count {
  position: absolute;
  right: 28rpx;
  bottom: 24rpx;
  font-size: 23rpx;
  color: #bbb;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.image-preview {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 10rpx;
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
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  font-size: 56rpx;
  color: #ccc;
}

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

  &[disabled] { opacity: 0.45; }

  &::after { display: none; }
}
</style>
