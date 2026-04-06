<template>
  <view class="page-index">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <view class="city-selector" @click="onCitySelect">
          <text class="city-name">{{ cityName }}</text>
          <text class="arrow">▼</text>
        </view>
        <!-- 搜索框 -->
        <view class="search-bar" @click="goSearch">
          <text class="search-placeholder">搜索车型 / 品牌</text>
        </view>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <view class="banner-section">
      <swiper
        class="banner-swiper"
        :indicator-dots="true"
        :autoplay="true"
        :interval="4000"
        :duration="500"
        circular
      >
        <swiper-item v-for="(item, idx) in banners" :key="idx">
          <image class="banner-img" :src="item.imageUrl" mode="aspectFill" @click="onBannerTap(item)" />
        </swiper-item>
      </swiper>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view
        v-for="(entry, idx) in quickEntries"
        :key="idx"
        class="entry-item"
        @click="onEntryTap(entry)"
      >
        <image class="entry-icon" :src="entry.icon || '/static/icons/default.png'" />
        <text class="entry-label">{{ entry.label }}</text>
      </view>
    </view>

    <!-- 推荐车辆 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">推荐车辆</text>
        <text class="section-more" @click="goVehicleList">查看更多 ></text>
      </view>
      <scroll-view scroll-x class="vehicle-scroll">
        <view class="vehicle-list-h">
          <gy-car-card
            v-for="car in recommendVehicles"
            :key="car.id"
            :vehicle="car"
            @click="goCarDetail"
          />
        </view>
      </scroll-view>
      <view v-if="!recommendVehicles.length && !loadingVehicles" class="empty-tip">
        暂无推荐车辆
      </view>
    </view>

    <!-- 附近门店 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">附近门店</text>
        <text class="section-more" @click="goStoreMap">查看更多 ></text>
      </view>
      <view class="store-list">
        <view
          v-for="store in nearbyStores"
          :key="store.id"
          class="store-card"
          @click="goStoreDetail(store)"
        >
          <view class="store-icon">📍</view>
          <view class="store-info">
            <text class="store-name">{{ store.name }}</text>
            <text class="store-address">{{ store.address }}</text>
          </view>
          <view class="store-right">
            <text class="store-distance">{{ store.distance || '--' }}</text>
            <text class="store-nav" @click.stop="navigateToStore(store)">导航</text>
          </view>
        </view>
      </view>
      <view v-if="!nearbyStores.length && !loadingStores" class="empty-tip">
        附近暂无门店
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 120rpx;"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as vehicleApi from '@/api/vehicle'
import type { VehicleListItem, Store } from '@/types/vehicle'

// ==================== 数据 ====================

const cityName = ref('北京市')
const loadingVehicles = ref(false)
const loadingStores = ref(false)

/** Banner 数据 */
const banners = ref<Array<{ imageUrl: string; linkType: string; linkValue?: string }>>([
  { imageUrl: 'https://via.placeholder.com/750x300?text=新用户首单立减50元', linkType: 'activity' },
  { imageUrl: 'https://via.placeholder.com/750x300?text=周末特惠日租88折', linkType: 'activity' },
])

/** 快捷入口 */
const quickEntries = ref([
  { label: '热门车型', icon: '', path: '/pages/car/list' },
  { label: '附近门店', icon: '', path: '/pages/store/map' },
  { label: '优惠券', icon: '', path: '/pages/user/coupon' },
  { label: '活动中心', icon: '', path: '/pages/activity/list' },
])

/** 推荐车辆 */
const recommendVehicles = ref<VehicleListItem[]>([])

/** 附近门店 */
const nearbyStores = ref<Store[]>([])

// ==================== 生命周期 ====================

onMounted(() => {
  fetchRecommendVehicles()
  fetchNearbyStores()
})

// ==================== 方法 ====================

async function fetchRecommendVehicles() {
  loadingVehicles.value = true
  try {
    const res = await vehicleApi.getNearbyVehicles({ recommend: true, pageSize: 10 })
    if (res.data?.list) {
      recommendVehicles.value = res.data.list
    }
  } catch {
    // 静默处理
  } finally {
    loadingVehicles.value = false
  }
}

async function fetchNearbyStores() {
  loadingStores.value = true
  try {
    const res = await vehicleApi.getStoreList({ pageSize: 5 })
    if (res.data?.list) {
      nearbyStores.value = res.data.list
    }
  } catch {
    // 静默处理
  } finally {
    loadingStores.value = false
  }
}

function onCitySelect() {
  uni.showToast({ title: '城市选择功能开发中', icon: 'none' })
}
function goSearch() {
  uni.navigateTo({ url: '/pages/car/list' })
}
function onBannerTap(item: any) {
  console.log('Banner 点击:', item)
}
function onEntryTap(entry: any) {
  if (entry.path) uni.navigateTo({ url: entry.path })
}
function goVehicleList() {
  uni.switchTab({ url: '/pages/car/list' })  // 或 navigateTo
}
function goCarDetail(vehicleId: number) {
  uni.navigateTo({ url: `/pages/car/detail?id=${vehicleId}` })
}
function goStoreMap() {
  uni.navigateTo({ url: '/pages/store/map' })
}
function goStoreDetail(store: Store) {
  uni.navigateTo({ url: `/pages/store/detail?id=${store.id}` })
}
function navigateToStore(store: Store) {
  // 调用地图导航
  uni.openLocation({
    latitude: store.latitude,
    longitude: store.longitude,
    name: store.name,
    address: store.address,
  })
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh;
}

/* 导航栏 */
.nav-bar {
  background: var(--primary-color);
  padding-top: var(--status-bar-height, 44px);
  padding-bottom: 16rpx;

  .nav-content {
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    gap: 16rpx;

    .city-selector {
      display: flex;
      align-items: center;
      color: #fff;
      font-size: 28rpx;
      white-space: nowrap;

      .arrow {
        font-size: 18rpx;
        margin-left: 6rpx;
      }
    }

    .search-bar {
      flex: 1;
      height: 64rpx;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 32rpx;
      display: flex;
      align-items: center;
      padding: 0 24rpx;

      .search-placeholder {
        color: rgba(255, 255, 255, 0.7);
        font-size: 26rpx;
      }
    }
  }
}

/* Banner */
.banner-section {
  padding: 20rpx 24rpx;

  .banner-swiper {
    height: 280rpx;
    border-radius: 16rpx;
    overflow: hidden;

    .banner-img {
      width: 100%;
      height: 100%;
      border-radius: 16rpx;
    }
  }
}

/* 快捷入口 */
.quick-entry {
  display: flex;
  justify-content: space-around;
  padding: 30rpx 24rpx;
  background: var(--bg-primary);
  margin: 0 24rpx;
  border-radius: 16rpx;

  .entry-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;

    .entry-icon {
      width: 80rpx;
      height: 80rpx;
      border-radius: 20rpx;
      background: linear-gradient(135deg, #e6f7ff, #bae7ff);
    }
    .entry-label {
      font-size: 22rpx;
      color: var(--text-secondary);
    }
  }
}

/* 区块通用 */
.section {
  margin-top: 20rpx;
  padding: 0 24rpx;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-top: 10rpx;

    .section-title {
      font-size: 32rpx;
      font-weight: bold;
      color: var(--text-primary);
    }
    .section-more {
      font-size: 24rpx;
      color: var(--text-tertiary);
    }
  }
}

/* 横向车辆列表 */
.vehicle-scroll {
  white-space: nowrap;

  .vehicle-list-h {
    display: inline-flex;
    gap: 20rpx;

    :deep(.gy-car-card) {
      width: 320rpx;
      flex-shrink: 0;
    }
  }
}

/* 门店列表 */
.store-list {
  .store-card {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid var(--border-light);

    &:last-child { border-bottom: none; }

    .store-icon {
      font-size: 36rpx;
      margin-right: 16rpx;
    }

    .store-info {
      flex: 1;

      .store-name {
        font-size: 28rpx;
        font-weight: 600;
        color: var(--text-primary);
        display: block;
      }
      .store-address {
        font-size: 22rpx;
        color: var(--text-tertiary);
        margin-top: 4rpx;
        display: block;
      }
    }

    .store-right {
      text-align: right;

      .store-distance {
        font-size: 22rpx;
        color: var(--warning-color);
        display: block;
      }
      .store-nav {
        font-size: 22rpx;
        color: var(--primary-color);
        margin-top: 4rpx;
        display: block;
      }
    }
  }
}

.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  color: var(--text-tertiary);
  font-size: 26rpx;
}
</style>
