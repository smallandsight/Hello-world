<template>
  <view class="page-pickup">
    <!-- 顶部提示 -->
    <view class="header-tip">
      <text class="tip-icon">⚠️</text>
      <text class="tip-text">请确认车辆外观、油量/电量、里程数无误后确认取车</text>
    </view>

    <!-- 车辆信息 -->
    <view class="card">
      <view class="card-title">车辆信息</view>
      <view class="info-row">
        <image class="car-thumb" :src="order.vehicleImage" mode="aspectFill" />
        <view>
          <text class="name">{{ order.vehicleName }}</text>
          <text class="plate">{{ order.vehicleNo }}</text>
        </view>
      </view>
    </view>

    <!-- 取车确认项 -->
    <view class="card">
      <view class="card-title">取车检查清单</view>

      <view class="check-item">
        <checkbox :checked="checkList.bodyOK" @tap="checkList.bodyOK = !checkList.bodyOK" color="#1890FF" />
        <text>车身无划痕、凹陷等损伤</text>
      </view>

      <view class="check-item">
        <checkbox :checked="checkList.tireOK" @tap="checkList.tireOK = !checkList.tireOK" color="#1890FF" />
        <text>轮胎气压正常，无明显磨损</text>
      </view>

      <view class="check-item">
        <checkbox :checked="checkList.glassOK" @tap="checkList.glassOK = !checkList.glassOK" color="#1890FF" />
        <text>挡风玻璃完好，无裂痕</text>
      </view>

      <!-- 里程和油量表 -->
      <view class="input-row">
        <text class="input-label">当前里程表读数（km）</text>
        <input v-model="mileage" type="digit" placeholder="输入里程" class="input-box" />
      </view>
      <view class="input-row">
        <text class="input-label">当前油量/电量（%）</text>
        <input v-model="fuelLevel" type="digit" placeholder="0-100" class="input-box short" />
      </view>

      <!-- 拍照上传 -->
      <view class="photo-section">
        <text class="section-label">车辆现状拍照（选填）</text>
        <view class="photo-grid">
          <view
            v-for="(img, idx) in photos"
            :key="idx"
            class="photo-item"
          >
            <image :src="img" mode="aspectFill" @click="removePhoto(idx)" />
          </view>
          <view class="photo-add" @click="addPhoto" v-if="photos.length < 3">
            <text>+</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar safe-area-bottom">
      <button
        class="btn-confirm"
        :class="{ disabled: !allChecked }"
        :disabled="!allConfirmed"
        @click="doPickup"
      >确认取车</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as orderApi from '@/api/order'

let orderId: string | null = null
const order = ref<any>({})
const checkList = reactive({ bodyOK: false, tireOK: false, glassOK: false })
const mileage = ref('')
const fuelLevel = ref('')
const photos = ref<string[]>([])

const allChecked = computed(() => checkList.bodyOK && checkList.tireOK && checkList.glassOK)
const allConfirmed = computed(() => allChecked.value && mileage.value !== '' && fuelLevel.value !== '')

onLoad((options) => {
  orderId = options?.orderId || null
  if (orderId) fetchOrderDetail()
})

async function fetchOrderDetail() {
  try {
    const res = await orderApi.getOrderDetail(orderId!)
    order.value = res.data || {}
  } catch { /* handled */ }
}

async function doPickup() {
  if (!allConfirmed.value) return

  uni.showLoading({ title: '取车中...', mask: true })
  try {
    await orderApi.pickupVehicle(orderId!, {
      mileage: Number(mileage.value),
      fuelLevel: Number(fuelLevel.value),
    })
    uni.hideLoading()
    uni.showToast({ title: '取车成功！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) { uni.hideLoading() }
}

function addPhoto() {
  uni.chooseImage({
    count: 3 - photos.value.length,
    sizeType: ['compressed'],
    success(res) {
      photos.value.push(...res.tempFilePaths.map(p => p))
    },
  })
}
function removePhoto(idx: number) {
  photos.value.splice(idx, 1)
}
</script>

<style lang="scss" scoped>
.page-pickup { min-height: 100vh; background: var(--bg-secondary); padding-bottom: 140rpx; }

.header-tip {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #fffbe6;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #d48806;

  .tip-icon { font-size: 32rpx; }
}

.card {
  margin: 20rpx 24rpx;
  background: var(--bg-primary);
  border-radius: 16rpx;
  padding: 24rpx;

  .card-title {
    font-size: 28rpx; font-weight: 600;
    color: var(--text-primary); margin-bottom: 20rpx;
  }
}

.info-row {
  display: flex; gap: 20rpx; align-items: center;
  .car-thumb {
    width: 160rpx; height: 120rpx; border-radius: 12rpx; background: #f5f5f5;
  }
  .name { font-size: 30rpx; font-weight: bold; display: block; }
  .plate { font-size: 26rpx; color: var(--text-secondary); margin-top: 6rpx; display: block; }
}

.check-item {
  display: flex; align-items: center; gap: 14rpx; padding: 16rpx 0; border-bottom: 1rpx solid var(--border-light);
  text { font-size: 28rpx; color: var(--text-primary); }
}

.input-row {
  display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1rpx solid var(--border-light);
  .input-label { font-size: 28rpx; color: var(--text-secondary); }
  .input-box {
    border: 1rpx solid var(--border-color); border-radius: 8rpx; padding: 12rpx 20rpx; font-size: 28rpx; min-width: 200rpx; text-align: right;
    &.short { min-width: 120rpx; }
  }
}

.photo-section {
  margin-top: 24rpx;
  .section-label { font-size: 26rpx; color: var(--text-secondary); display: block; margin-bottom: 16rpx; }
  .photo-grid {
    display: flex; gap: 16rpx;
    .photo-item, .photo-add {
      width: 160rpx; height: 160rpx; border-radius: 12rpx;
      overflow: hidden;
      image { width: 100%; height: 100%; }
    }
    .photo-add {
      border: 2rpx dashed var(--border-color);
      display: flex; align-items: center; justify-content: center;
      text { font-size: 56rpx; color: var(--text-tertiary); line-height: 1; }
    }
  }
}

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; background: var(--bg-primary);
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);

  .btn-confirm {
    height: 88rpx; line-height: 88rpx; text-align: center; font-size: 32rpx; font-weight: 600;
    background: linear-gradient(135deg, #52c41a, #389e0d); color: #fff; border-radius: 44rpx; border: none;

    &.disabled { opacity: 0.4; }
  }
}
</style>
