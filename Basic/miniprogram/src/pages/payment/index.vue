<template>
  <view class="page-payment">
    <!-- 支付状态 -->
    <view class="pay-status" :class="{ paying: status === 'paying', success: status === 'success', failed: status === 'failed' }">
      <text v-if="status === 'paying'" class="status-icon">💳</text>
      <text v-if="status === 'success'" class="status-icon">✅</text>
      <text v-if="status === 'failed'" class="status-icon">❌</text>
      <text class="status-text">{{ statusText }}</text>
      <text class="status-desc">{{ statusDesc }}</text>
    </view>

    <!-- 订单信息 -->
    <view class="card" v-if="status !== 'paying' && status !== ''">
      <view class="order-summary">
        <text class="summary-title">{{ orderInfo.vehicleName || '订单支付' }}</text>
        <text class="summary-amount">¥{{ (payAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area" v-if="status === 'failed'">
      <button class="btn-retry" @click="retryPay">重新支付</button>
      <button class="btn-back" plain @click="goBack">返回订单</button>
    </view>
    <view class="action-area" v-if="status === 'success'">
      <button class="btn-detail" @click="goOrderDetail">查看订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as paymentApi from '@/api/payment'

let orderId: string | null = null
const status = ref<'idle' | 'paying' | 'success' | 'failed'>('idle')
const payAmount = ref(0)
const orderInfo = ref<any>({})

const statusText = computed(() => ({
  idle: '', paying: '正在调起支付...', success: '支付成功', failed: '支付失败',
}[status.value]))

const statusDesc = computed(() => {
  switch (status.value) {
    case 'paying': '请勿关闭页面'
    case 'success': '您的订单支付已完成'
    case 'failed': '如未扣款请重试，已扣款将原路退回'
    default: return ''
  }
})

onLoad((options) => {
  orderId = options?.orderId || null
  if (orderId) doPay()
})

async function doPay() {
  if (!orderId) return

  status.value = 'paying'

  try {
    // 1. 调用后端创建微信预订单
    const res = await paymentApi.createWxPayment(orderId)
    const payParams = res.data?.payParams
    payAmount.value = res.data?.tradeNo ? 0 : orderInfo.value.totalAmount || 0

    // 2. 调用小程序支付
    await callWxPayment(payParams)

    // 3. 支付回调成功
    status.value = 'success'
  } catch (e: any) {
    console.error('支付失败:', e)
    status.value = 'failed'
  }
}

/** 调用 wx.requestPayment（支付宝/微信统一封装） */
function callWxPayment(params: any): Promise<void> {
  return new Promise((resolve, reject) => {
    // uni-app 统一调用
    // eslint-disable-next-line no-undef
    uni.requestPayment({
      provider: 'wxpay', // 或 'alipay'
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType || 'RSA',
      paySign: params.paySign,
      success(res) {
        resolve()
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

function retryPay() {
  doPay()
}
function goBack() {
  uni.navigateBack()
}
function goOrderDetail() {
  uni.redirectTo({ url: `/pages/order/detail?id=${orderId}` })
}
</script>

<style lang="scss" scoped>
.page-payment {
  min-height: 100vh; background: var(--bg-secondary);
  display: flex; flex-direction: column; align-items: center;
  padding-top: 160rpx;
}

.pay-status {
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
  padding: 60rpx 80rpx;
  border-radius: 24rpx;

  &.paying { background: #e6f7ff; }
  &.success { background: #f6ffed; }
  &.failed { background: #fff2f0; }

  .status-icon { font-size: 72rpx; }
  .status-text { font-size: 36rpx; font-weight: bold; }
  &.paying .status-text { color: #0958d9; }
  &.success .status-text { color: #389e0d; }
  &.failed .status-text { color: #cf1322; }
  .status-desc { font-size: 26rpx; color: var(--text-secondary); text-align: center; }
}

.card {
  margin-top: 40rpx; width: calc(100% - 96rpx);
  background: var(--bg-primary); border-radius: 16rpx; padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);

  .order-summary {
    display: flex; justify-content: space-between; align-items: center;
    .summary-title { font-size: 30rpx; color: var(--text-primary); }
    .summary-amount { font-size: 42rpx; font-weight: bold; color: #f5222d; }
  }
}

.action-area {
  margin-top: 60rpx; display: flex; flex-direction: column; gap: 20rpx; align-items: center; width: 400rpx;

  button {
    width: 100%; height: 88rpx; line-height: 88rpx; border-radius: 44rpx;
    font-size: 32rpx; font-weight: 600; border: none;
  }

  .btn-retry { background: linear-gradient(135deg, #1890ff, #096dd9); color: #fff; }
  .btn-back { background: transparent; color: var(--primary-color); border: 1rpx solid var(--primary-color); }
  .btn-detail { background: linear-gradient(135deg, #52c41a, #389e0d); color: #fff; }
}
</style>
