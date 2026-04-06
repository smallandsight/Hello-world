<template>
  <view class="page-order-confirm">
    <!-- 车辆信息卡片 -->
    <view class="card vehicle-card">
      <image class="vehicle-img" :src="vehicle?.image || '/static/images/car-placeholder.png'" mode="aspectFill" />
      <view class="vehicle-info">
        <text class="v-name">{{ vehicle?.brand }} {{ vehicle?.model }}</text>
        <text class="v-spec">{{ vehicle?.seatCount || 5 }}座 · {{ vehicle?.transmissionText || '自动挡' }}</text>
        <text class="v-price">¥{{ (vehicle?.dailyRate ?? 0) / 100 }}/天</text>
      </view>
    </view>

    <!-- 取还车信息 -->
    <view class="card section-card">
      <view class="section-title">取还车信息</view>
      <view class="time-row" @click="showPickupTimePicker = true">
        <text class="row-label">取车时间</text>
        <text class="row-value">{{ orderStore.rentalTime.startTime || '请选择' }} ></text>
      </view>
      <view class="time-row" @click="showReturnTimePicker = true">
        <text class="row-label">还车时间</text>
        <text class="row-value">{{ orderStore.rentalTime.endTime || '请选择' }} ></text>
      </view>

      <view class="store-row" @click="goSelectStore('pickup')">
        <text class="row-label">取车门店</text>
        <text class="row-value">{{ orderStore.pickupStore?.name || '选择门店' }} >></text>
      </view>
      <view class="store-row" @click="goSelectStore('return')">
        <text class="row-label">还车门店</text>
        <text class="row-value">{{ orderStore.returnStore?.name || '选择门店' }} >></text>
      </view>
    </view>

    <!-- 保险选择 -->
    <view class="card section-card">
      <view class="section-title">保险方案</view>
      <view
        v-for="(opt, idx) in insuranceOptions"
        :key="idx"
        :class="['option-item', { active: orderStore.insuranceType === opt.value }]"
        @click="orderStore.setInsuranceType(opt.value)"
      >
        <radio :checked="orderStore.insuranceType === opt.value" color="#1890FF" />
        <view class="option-info">
          <text class="opt-name">{{ opt.label }}</text>
          <text class="opt-desc">{{ opt.desc }}</text>
        </view>
        <text class="opt-price">¥{{ opt.price }}/天</text>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="card section-card coupon-row" @click="selectCoupon">
      <text class="row-label">优惠券</text>
      <view class="coupon-right">
        <text v-if="selectedCouponName" class="coupon-name">{{ selectedCouponName }}</text>
        <text v-else class="coupon-placeholder">选择可用优惠券</text>
        <text class="arrow">></text>
      </view>
    </view>

    <!-- 费用明细 -->
    <gy-fee-detail
      v-if="feePreview"
      title="费用明细"
      :fee="feePreview"
      :collapsible="true"
      :default-expanded="true"
      :deposit-amount="500000"
      :violation-deposit="100000"
    />

    <!-- 支付方式 -->
    <view class="card section-card">
      <view class="pay-method">
        <radio checked color="#1890FF" />
        <text class="pay-text">微信支付</text>
      </view>
    </view>

    <!-- 协议 + 提交栏 -->
    <view class="submit-area safe-area-bottom">
      <view class="agreement-row">
        <checkbox :checked="agreed" @tap="agreed = !agreed" color="#1890FF" size="28rpx" />
        <text class="agree-text">我已阅读并同意</text>
        <text class="link" @click="openAgreement">《租车服务协议》</text>
        <text class="link" @click="openPrivacy">《隐私政策》</text>
      </view>
      <view class="submit-bar">
        <view class="total">
          <text class="label">合计：</text>
          <text class="amount">{{ orderStore.totalAmountDisplay }}</text>
        </view>
        <button class="btn-submit" :disabled="!canSubmit" @click="handleSubmitOrder">
          提交订单
        </button>
      </view>
    </view>

    <!-- 时间选择器 -->
    <uni-datetime-picker
      type="datetime"
      v-model="tempPickupTime"
      :visible="showPickupTimePicker"
      @confirm="onPickupTimeConfirm"
      @close="showPickupTimePicker = false"
    />
    <uni-datetime-picker
      type="datetime"
      v-model="tempReturnTime"
      :visible="showReturnTimePicker"
      @confirm="onReturnTimeConfirm"
      @close="showReturnTimePicker = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import * as orderApi from '@/api/order'
import * as couponApi from '@/api/coupon'

const orderStore = useOrderStore()
const userStore = useUserStore()

// ==================== 数据 ====================

const vehicle = computed(() => orderStore.selectedVehicle)
const feePreview = computed(() => orderStore.feePreview)

const agreed = ref(false)
const showPickupTimePicker = ref(false)
const showReturnTimePicker = ref(false)
const tempPickupTime = ref('')
const tempReturnTime = ref('')

const selectedCouponName = computed(() => {
  // TODO: 从 Store 获取优惠券名称
  return ''
})

const canSubmit = computed(() => {
  return orderStore.canSubmitOrder && agreed.value
})

const insuranceOptions = [
  { value: 'basic' as const, label: '基础险', desc: '车损5000元以上赔付', price: 20 },
  { value: 'premium' as const, label: '不计免赔险', desc: '车损全额赔付 [推荐]', price: 50 },
  { value: 'none' as const, label: '不购买', desc: '自行承担全部风险', price: 0 },
]

// ==================== 生命周期 ====================

onLoad((options) => {
  if (options.vehicleId) {
    // 获取车辆详情填充到 store
    // TODO: fetchVehicleDetail(Number(options.vehicleId))
  }
})

// ==================== 方法 ====================

function onPickupTimeConfirm(e: any) {
  const val = e.detail?.value
  if (val) {
    orderStore.setRentalTime(val, orderStore.rentalTime.endTime)
  }
  showPickupTimePicker.value = false
}

function onReturnTimeConfirm(e: any) {
  const val = e.detail?.value
  if (val) {
    orderStore.setRentalTime(orderStore.rentalTime.startTime, val)
  }
  showReturnTimePicker.value = false
}

function goSelectStore(type: 'pickup' | 'return') {
  uni.navigateTo({
    url: `/pages/store/list?type=${type}`,
  })
}

async function selectCoupon() {
  // 暂时跳过 — 需要先创建预订单才能查询可用券
  uni.showToast({ title: '请先选择时间', icon: 'none' })
}

async function handleSubmitOrder() {
  if (!canSubmit.value) return

  try {
    uni.showLoading({ title: '提交中...', mask: true })

    const res = await orderApi.createOrder({
      storeId: orderStore.pickupStore!.id,
      items: [{
        vehicleId: orderStore.selectedVehicle!.id,
        startTime: orderStore.rentalTime.startTime,
        endTime: orderStore.rentalTime.endTime,
      }],
      pickupStoreId: orderStore.pickupStore!.id,
      returnStoreId: orderStore.returnStore!.id,
      insuranceType: orderStore.insuranceType,
      userCouponId: orderStore.selectedCouponId,
    })

    uni.hideLoading()

    // 创建成功 → 跳转到支付页
    const orderId = res.data.id
    uni.redirectTo({ url: `/pages/payment/index?orderId=${orderId}` })
  } catch (err: any) {
    uni.hideLoading()
    // 错误已在 request.ts 中 toast 展示
    console.error('创建订单失败:', err)
  }
}

function openAgreement() {
  uni.navigateTo({ url: '/static/agreement/service.html' })  // 或 webview
}
function openPrivacy() {
  uni.navigateTo({ url: '/static/agreement/privacy.html' })
}
</script>

<style lang="scss" scoped>
.page-order-confirm {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding-bottom: 240rpx;
}

.card {
  margin: 20rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;

  &.vehicle-card {
    display: flex;
    padding: 24rpx;
    background: var(--bg-primary);

    .vehicle-img {
      width: 200rpx;
      height: 150rpx;
      border-radius: 12rpx;
      background: #f5f5f5;
      flex-shrink: 0;
    }

    .vehicle-info {
      flex: 1;
      padding-left: 20rpx;
      display: flex;
      flex-direction: column;
      justify-content: space-around;

      .v-name { font-size: 32rpx; font-weight: bold; color: var(--text-primary); }
      .v-spec { font-size: 24rpx; color: var(--text-secondary); }
      .v-price { font-size: 30rpx; font-weight: bold; color: #f5222d; }
    }
  }

  &.section-card {
    padding: 24rpx;
    background: var(--bg-primary);
  }
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20rpx;
}

.time-row, .store-row, .coupon-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--border-light);

  &:last-child { border-bottom: none; }
}

.row-label { font-size: 28rpx; color: var(--text-secondary); }
.row-value {
  font-size: 28rpx;
  color: var(--text-primary);
}

/* 保险选项 */
.option-item {
  display: flex;
  align-items: center;
  padding: 20rpx 12rpx;
  border: 2rpx solid var(--border-light);
  border-radius: 12rpx;
  margin-top: 16rpx;
  gap: 16rpx;

  &:first-of-type { margin-top: 0; }
  &.active {
    border-color: var(--primary-color);
    background: #e6f7ff;
  }

  .option-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .opt-name { font-size: 28rpx; color: var(--text-primary); }
    .opt-desc { font-size: 22rpx; color: var(--text-tertiary); }
  }
  .opt-price { font-size: 28rpx; font-weight: 600; color: #f5222d; }
}

/* 优惠券行 */
.coupon-right {
  display: flex;
  align-items: center;
  gap: 8rpx;

  .coupon-name { font-size: 26rpx; color: #f5222d; }
  .coupon-placeholder { font-size: 26rpx; color: var(--text-tertiary); }
  .arrow { font-size: 24rpx; color: var(--text-tertiary); }
}

/* 支付方式 */
.pay-method {
  display: flex;
  align-items: center;
  gap: 12rpx;

  .pay-text { font-size: 28rpx; color: var(--text-primary); }
}

/* 底部提交区 */
.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);

  .agreement-row {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    font-size: 22rpx;
    flex-wrap: wrap;

    .agree-text { color: var(--text-secondary); }
    .link { color: var(--primary-color); }
  }

  .submit-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 24rpx;
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);

    .total {
      display: flex;
      align-items: baseline;
      .label { font-size: 26rpx; color: var(--text-secondary); }
      .amount { font-size: 40rpx; font-weight: bold; color: #f5222d; }
    }

    .btn-submit {
      width: 260rpx;
      height: 80rpx;
      line-height: 80rpx;
      text-align: center;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff;
      font-size: 30rpx;
      font-weight: 600;
      border-radius: 40rpx;
      border: none;

      &[disabled] {
        opacity: 0.4;
      }
    }
  }
}
</style>
