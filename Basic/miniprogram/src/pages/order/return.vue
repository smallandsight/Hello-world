<template>
  <view class="page-return">
    <view class="header-tip">
      <text class="tip-icon">🚗</text>
      <text class="tip-text">还车前请确认车内物品已带离，车辆停放在指定位置</text>
    </view>

    <!-- 预估费用 -->
    <view class="card fee-card" v-if="feePreview">
      <view class="card-title">预估费用</view>
      <gy-fee-detail
        :fee="feePreview"
        :collapsible="false"
        :deposit-amount="feePreview.depositAmount"
        :violation-deposit="feePreview.violationDeposit"
      />
    </view>

    <!-- 还车确认 -->
    <view class="card">
      <view class="card-title">还车确认</view>
      <view class="input-row">
        <text class="label">当前里程表读数（km）</text>
        <input v-model="mileage" type="digit" class="input" placeholder="输入里程" />
      </view>
      <view class="input-row">
        <text class="label">当前油量/电量（%）</text>
        <input v-model="fuelLevel" type="digit" class="input short" placeholder="0-100" />
      </view>

      <view class="note-text">
        <text>实际费用以系统计算为准，如有超时将收取额外费用</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar safe-area-bottom">
      <button class="btn-return" :disabled="!canSubmit" @click="doReturn">
        确认还车
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as orderApi from '@/api/order'

let orderId: string | null = null
const feePreview = ref<any>(null)
const mileage = ref('')
const fuelLevel = ref('')

const canSubmit = computed(() => mileage.value !== '' && fuelLevel.value !== '')

onLoad((options) => {
  orderId = options?.orderId || null
  if (orderId) {
    fetchDetail()
    previewPrice()
  }
})

async function fetchDetail() {
  try {
    const res = await orderApi.getOrderDetail(orderId!)
    // 可用于展示车辆信息等
  } catch { /* handled */ }
}

async function previewPrice() {
  try {
    const res = await orderApi.previewSettlement({ vehicleId: 0, startTime: '', endTime: '' })
    feePreview.value = res.data
  } catch { /* handled */ }
}

async function doReturn() {
  if (!canSubmit.value) return

  uni.showLoading({ title: '还车中...', mask: true })
  try {
    const res = await orderApi.returnVehicle(orderId!, {
      mileage: Number(mileage.value),
      fuelLevel: Number(fuelLevel.value),
    })
    uni.hideLoading()
    uni.showToast({ title: '还车成功！', icon: 'success' })

    // 如果需要最终结算
    setTimeout(() => {
      if (res.data?.id) {
        uni.redirectTo({ url: `/pages/order/detail?id=${orderId}` })
      } else {
        uni.navigateBack()
      }
    }, 1500)
  } catch (e) { uni.hideLoading() }
}
</script>

<style lang="scss" scoped>
.page-return { min-height: 100vh; background: var(--bg-secondary); padding-bottom: 140rpx; }

.header-tip {
  display: flex; align-items: center; gap: 10rpx;
  background: #e6f7ff; padding: 20rpx 24rpx;
  font-size: 26rpx; color: #0958d9;
}

.card {
  margin: 20rpx 24rpx; background: var(--bg-primary); border-radius: 16rpx; padding: 24rpx;
  .card-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary); margin-bottom: 20rpx; }
}

.input-row {
  display: flex; justify-content: space-between; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid var(--border-light);
  .label { font-size: 28rpx; color: var(--text-secondary); }
  .input {
    border: 1rpx solid var(--border-color); border-radius: 8rpx; padding: 12rpx 20rpx; font-size: 28rpx; min-width: 200rpx; text-align: right;
    &.short { min-width: 120rpx; }
  }
}

.note-text {
  margin-top: 16rpx; text { font-size: 22rpx; color: var(--text-tertiary); }
}

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; background: var(--bg-primary);
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);

  .btn-return {
    height: 88rpx; line-height: 88rpx; text-align: center; font-size: 32rpx; font-weight: 600;
    background: linear-gradient(135deg, #1890ff, #096dd9); color: #fff; border-radius: 44rpx; border: none;

    &[disabled] { opacity: 0.4; }
  }
}
</style>
