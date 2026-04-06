<template>
  <view class="favorite-page">
    <!-- 列表 -->
    <scroll-view
      scroll-y
      class="fav-scroll"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="fav-list">
        <view
          v-for="(item, index) in list"
          :key="index"
          class="fav-item"
        >
          <!-- 车辆图片 -->
          <image
            :src="item.coverImage || '/static/icons/default-car.png'"
            class="car-img"
            mode="aspectFill"
            @click="goDetail(item.vehicleId)"
          />
          <!-- 信息区 -->
          <view class="fav-info" @click="goDetail(item.vehicleId)">
            <text class="car-name">{{ item.brand }} {{ item.model }}</text>
            <view class="car-tags">
              <text
                v-for="(tag, ti) in (item.tags || []).slice(0, 3)"
                :key="ti"
                class="tag"
              >{{ tag }}</text>
            </view>
            <view class="fav-bottom">
              <text class="price">¥{{ item.dailyPriceCents ? (item.dailyPriceCents / 100).toFixed(0) : '--' }}/天</text>
              <text class="store-name">{{ item.storeName || '' }}</text>
            </view>
          </view>
          <!-- 取消收藏按钮 -->
          <view
            class="unfav-btn"
            @click.stop="handleUnfavorite(item.vehicleId)"
          >
            <text>✕</text>
          </view>
        </view>

        <view v-if="hasMore" class="load-more">加载中...</view>
        <view v-else-if="page > 1" class="no-more">— 已加载全部 —</view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <image src="/static/icons/empty-fav.png" mode="aspectFit" class="empty-img" />
        <text class="empty-title">暂无收藏</text>
        <text class="empty-desc">浏览车辆时点击爱心即可收藏</text>
        <button class="btn-browse" @click="goBrowse">去逛逛</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getFavorites, removeFavorite } from '@/api/favorite'

// 收藏项类型（后端返回的车辆信息+收藏关系）
interface FavoriteItem {
  vehicleId: number
  brand?: string
  model?: string
  coverImage?: string
  tags?: string[]
  dailyPriceCents?: number
  storeName?: string
}

// ==================== 状态 ====================
const list = ref<FavoriteItem[]>([])
const page = ref(1)
const pageSize = 15
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)

// ==================== 方法 ====================

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) page.value = 1
    const res = await getFavorites({ page: page.value, size: pageSize })
    // 假设返回格式 { list, total }
    const newList = res.data?.list || []
    list.value = reset ? newList : [...list.value, ...newList]
    hasMore.value = list.value.length < (res.data?.total || 0)
    page.value++
  } catch (e) {
    console.error('加载收藏失败:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function loadMore() {
  if (!hasMore.value) return
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  await loadData(true)
}

async function handleUnfavorite(vehicleId: number) {
  uni.showModal({
    title: '取消收藏',
    content: '确定取消收藏该车辆吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeFavorite(vehicleId)
        list.value = list.value.filter((f) => f.vehicleId !== vehicleId)
        uni.showToast({ title: '已取消收藏', icon: 'none' })
      } catch (e) {
        console.error('取消收藏失败:', e)
      }
    },
  })
}

function goDetail(vehicleId: number) {
  uni.navigateTo({ url: `/pages/car/detail?id=${vehicleId}` })
}

function goBrowse() {
  uni.switchTab({ url: '/pages/index/index' })
}

// ==================== 生命周期 ====================
onShow(() => {
  loadData(true)
})
</script>

<style lang="scss" scoped>
.favorite-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.fav-scroll {
  height: 100vh;
}

.fav-list {
  padding: 24rpx;
}

.fav-item {
  display: flex;
  background: #fff;
  border-radius: 14rpx;
  margin-bottom: 18rpx;
  overflow: hidden;
  position: relative;
}

.car-img {
  width: 220rpx;
  height: 180rpx;
  flex-shrink: 0;
  background: #eee;
}

.fav-info {
  flex: 1;
  padding: 18rpx 16rpx 18rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.car-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.car-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;

  .tag {
    font-size: 20rpx;
    padding: 2rpx 10rpx;
    background: #f5f5f5;
    color: #888;
    border-radius: 4rpx;
  }
}

.fav-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.price {
  font-size: 30rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.store-name {
  font-size: 22rpx;
  color: #bbb;
}

.unfav-btn {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 26rpx;
    color: #999;
  }
}

.load-more,
.no-more {
  text-align: center;
  padding: 28rpx;
  font-size: 25rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;
}

.empty-img {
  width: 220rpx;
  height: 220rpx;
  opacity: 0.3;
}

.empty-title {
  margin-top: 28rpx;
  font-size: 30rpx;
  color: #999;
  font-weight: 500;
}

.empty-desc {
  margin-top: 10rpx;
  font-size: 25rpx;
  color: #bbb;
}

.btn-browse {
  margin-top: 36rpx;
  width: 280rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #1890ff;
  color: #fff;
  font-size: 27rpx;
  border-radius: 36rpx;
  border: none;

  &::after {
    display: none;
  }
}
</style>
