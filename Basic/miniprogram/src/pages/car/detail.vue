<template>
  <view class="car-detail-page">
    <!-- 轮播图 -->
    <swiper class="car-swiper" :indicator-dots="true" :autoplay="true" :interval="4000" circular>
      <swiper-item v-for="(img, index) in vehicle.images || []" :key="index">
        <image :src="img.url" mode="aspectFill" class="swipe-img" />
      </swiper-item>
      <swiper-item v-if="!vehicle.images?.length">
        <image src="/static/icons/default-car.png" mode="aspectFill" class="swipe-img placeholder" />
      </swiper-item>
    </swiper>

    <!-- 车辆基本信息 -->
    <view class="info-card">
      <view class="info-header">
        <text class="car-name">{{ vehicle.brand }} {{ vehicle.model }}</text>
        <view class="fav-btn" @click="toggleFavorite">
          <text :class="{ favorited: isFavorited }">{{ isFavorited ? '♥' : '♡' }}</text>
        </view>
      </view>

      <view class="price-row">
        <text class="daily-price">¥{{ dailyPriceFormatted }}/天</text>
        <text class="original-price" v-if="vehicle.originalPriceCents">
          ¥{{ (vehicle.originalPriceCents / 100).toFixed(0) }}/天
        </text>
      </view>

      <view class="tag-row">
        <text v-for="(tag, i) in (vehicle.tags || []).slice(0, 5)" :key="i" class="info-tag">{{ tag }}</text>
      </view>

      <view class="detail-grid">
        <view v-if="vehicle.seatCount" class="d-cell">
          <text class="d-value">{{ vehicle.seatCount }}座</text>
          <text class="d-label">座位</text>
        </view>
        <view v-if="vehicle.fuelType" class="d-cell">
          <text class="d-value">{{ vehicle.fuelType }}</text>
          <text class="d-label">燃料</text>
        </view>
        <view v-if="vehicle.transmissionType" class="d-cell">
          <text class="d-value">{{ vehicle.transmissionType }}</text>
          <text class="d-label">变速箱</text>
        </view>
        <view v-if="vehicle.plateNumber" class="d-cell">
          <text class="d-value">{{ maskPlate(vehicle.plateNumber) }}</text>
          <text class="d-label">车牌</text>
        </view>
      </view>
    </view>

    <!-- 门店信息 -->
    <view v-if="store" class="store-card">
      <text class="card-title">取还车门店</text>
      <view class="store-info">
        <view class="store-main">
          <text class="store-name">{{ store.name }}</text>
          <text class="store-address">{{ store.address }}</text>
        </view>
        <view class="distance" v-if="store.distanceKm">
          {{ store.distanceKm.toFixed(1) }}km
        </view>
      </view>
      <view class="store-time">
        <text>营业时间：{{ store.openTime || '08:00-22:00' }}</text>
        <text>电话：{{ store.phone || '暂无' }}</text>
      </view>
    </view>

    <!-- 评价区域 -->
    <view class="review-section">
      <view class="section-header">
        <text class="card-title">用户评价</text>
        <text class="more-link" @click="goAllReviews">查看全部 ›</text>
      </view>
      <gy-review-summary :summary="reviewSummary" />
      <gy-review-list
        :reviews="recentReviews"
        @loadmore="loadMoreReviews"
        @refresh="refreshReviews"
      />
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <button class="btn-book" @click="goBook">立即预订</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVehicleDetail } from '@/api/vehicle'
import { addFavorite, removeFavorite, checkFavorited } from '@/api/favorite'
import { getVehicleReviewSummary, getVehicleReviews } from '@/api/review'
import type { Review, ReviewSummary, Vehicle, Store } from '@/types/extended'

// ==================== 状态 ====================
const vehicle = reactive<Partial<Vehicle>>({})
const store = ref<Store | null>(null)
const isFavorited = ref(false)

// 评价相关
const reviewSummary = ref<ReviewSummary | null>(null)
const recentReviews = ref<Review[]>([])

const dailyPriceFormatted = ref('0')

// ==================== 方法 ====================

async function loadDetail(id: number) {
  try {
    const res = await getVehicleDetail(id)
    if (res.data) {
      Object.assign(vehicle, res.data)
      if (res.data.dailyPriceCents) {
        dailyPriceFormatted.value = (res.data.dailyPriceCents / 100).toFixed(0)
      }
      if ((res.data as any).store) {
        store.value = (res.data as any).store
      }
    }
  } catch (e) {
    console.error('加载车辆详情失败:', e)
  }
}

async function checkFavStatus() {
  try {
    const res = await checkFavorited(Number((vehicle as any).id || 0))
    isFavorited.value = res.data?.favorited || false
  } catch (e) {
    // 静默处理
  }
}

async function toggleFavorite() {
  const vid = Number((vehicle as any).id || 0)
  if (!vid) return

  try {
    if (isFavorited.value) {
      await removeFavorite(vid)
      isFavorited.value = false
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await addFavorite(vid)
      isFavorited.value = true
      uni.showToast({ title: '已收藏', icon: 'none' })
    }
  } catch (e) {
    console.error('操作收藏失败:', e)
  }
}

async function loadReviewSummary() {
  const vid = Number((vehicle as any).id || 0)
  if (!vid) return

  try {
    const res = await getVehicleReviewSummary(vid)
    reviewSummary.value = res.data || null
  } catch (e) {
    // 静默处理
  }
}

async function loadRecentReviews() {
  const vid = Number((vehicle as any).id || 0)
  if (!vid) return

  try {
    const res = await getVehicleReviews(vid, { page: 1, size: 5 })
    recentReviews.value = res.data?.list || []
  } catch (e) {
    // 静默处理
  }
}

function loadMoreReviews() {}
function refreshReviews() {}

function goAllReviews() {
  // 可跳转到独立评价列表页
}

function goBook() {
  const vid = (vehicle as any).id
  uni.navigateTo({
    url: `/pages/order/confirm?vehicleId=${vid}`,
  })
}

function maskPlate(plate: string): string {
  if (!plate || plate.length <= 2) return plate
  return plate.substring(0, 2) + '**' + plate.slice(-2)
}

// ==================== 生命周期 ====================
onLoad((query) => {
  const id = Number(query?.id || 0)
  if (id) {
    loadDetail(id)
  }
})

// 页面显示时检查收藏状态 + 加载评价
import { onShow } from '@dcloudio/uni-app'
onShow(() => {
  if ((vehicle as any).id) {
    checkFavStatus()
    loadReviewSummary()
    loadRecentReviews()
  }
})
</script>

<style lang="scss" scoped>
.car-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx; // 为底部按钮留空
}

// 轮播图
.car-swiper {
  width: 100%;
  height: 480rpx;
  background: #eee;

  .swipe-img {
    width: 100%;
    height: 100%;

    &.placeholder {
      opacity: 0.3;
    }
  }
}

// 基本信息卡片
.info-card,
.store-card,
.review-section {
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 14rpx;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.car-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
}

.fav-btn {
  padding: 8rpx;

  text {
    font-size: 44rpx;
    color: #ccc;

    &.favorited {
      color: #ff4d4f;
    }
  }
}

.price-row {
  margin-top: 18rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.daily-price {
  font-size: 40rpx;
  font-weight: 800;
  color: #ff4d4f;
}

.original-price {
  font-size: 25rpx;
  color: #bbb;
  text-decoration: line-through;
}

.tag-row {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-top: 14rpx;
}

.info-tag {
  font-size: 21rpx;
  padding: 4rpx 12rpx;
  background: #f5f5f5;
  color: #888;
  border-radius: 6rpx;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #f5f5f5;
}

.d-cell {
  text-align: center;
}

.d-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.d-label {
  font-size: 21rpx;
  color:#999;
  display: block;
  margin-top: 4rpx;
}

// 门店卡片
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.store-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.store-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
}

.store-address {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-top: 4rpx;
}

.distance {
  font-size: 23rpx;
  color: #1890ff;
  background: #e6f7ff;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  white-space: nowrap;
}

.store-time {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
  display: flex;
  justify-content: space-between;
}

// 评价区
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.more-link {
  font-size: 25rpx;
  color: #1890ff;
}

// 底部栏
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.btn-book {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  color: #fff;
  font-size: 33rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;

  &::after {
    display: none;
  }
}
</style>
