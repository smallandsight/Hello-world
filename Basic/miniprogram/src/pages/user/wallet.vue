<template>
  <view class="wallet-page">
    <!-- 钱包卡片 -->
    <view class="wallet-card">
      <view class="wallet-header">
        <text class="wallet-label">账户余额（元）</text>
        <view class="eye-toggle" @click="toggleBalance">
          <image
            :src="
              showBalance
                ? '/static/icons/eye-open.png'
                : '/static/icons/eye-close.png'
            "
            class="eye-icon"
            mode="aspectFit"
          />
        </view>
      </view>
      <text class="wallet-amount">{{
        showBalance ? balanceFormatted : '****'
      }}</text>
      <view class="wallet-sub">
        <text>冻结金额：¥{{ frozenFormatted }}</text>
      </view>
      <view class="wallet-actions">
        <button class="btn-recharge" @click="goRecharge">充值</button>
        <button class="btn-plain" @click="goTransactions">流水明细</button>
      </view>
    </view>

    <!-- 快捷功能 -->
    <view class="quick-section">
      <view class="section-title">常用功能</view>
      <view class="quick-grid">
        <view
          v-for="item in quickItems"
          :key="item.name"
          class="quick-item"
          @click="navigateTo(item.path)"
        >
          <view class="quick-icon" :style="{ background: item.color }">
            <text class="icon-text">{{ item.icon }}</text>
          </view>
          <text class="quick-name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 最近流水 -->
    <view class="transaction-section">
      <view class="section-header">
        <text class="section-title">最近交易</text>
        <text class="more-link" @click="goTransactions">全部 ›</text>
      </view>
      <view v-if="transactions.length > 0" class="transaction-list">
        <view
          v-for="(item, index) in transactions"
          :key="index"
          class="transaction-item"
        >
          <view class="tx-left">
            <view
              class="tx-icon"
              :class="item.amount >= 0 ? 'tx-in' : 'tx-out'"
            >
              {{ getTxIcon(item.type) }}
            </view>
            <view class="tx-info">
              <text class="tx-remark">{{ item.remark || getTypeName(item.type) }}</text>
              <text class="tx-time">{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
          <text
            class="tx-amount"
            :class="item.amount >= 0 ? 'amount-in' : 'amount-out'"
          >
            {{ item.amount >= 0 ? '+' : '' }}{{ (item.amount / 100).toFixed(2) }}
          </text>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">暂无交易记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getWalletInfo,
  getWalletTransactions,
} from '@/api/wallet'
import type { WalletInfo, WalletTransaction } from '@/types/extended'

// ==================== 状态 ====================

const showBalance = ref(true)
const walletInfo = ref<WalletInfo | null>(null)
const transactions = ref<WalletTransaction[]>([])

const balanceFormatted = computed(() => {
  if (!walletInfo.value) return '0.00'
  return (walletInfo.value.balance / 100).toFixed(2)
})

const frozenFormatted = computed(() => {
  if (!walletInfo.value) return '0.00'
  return (walletInfo.value.frozenAmount / 100).toFixed(2)
})

// 快捷入口
const quickItems = [
  { name: '充值', icon: '💰', color: '#1890FF', path: '' },
  { name: '发票', icon: '🧾', color: '#52C41A', path: '/pages/user/invoice' },
  { name: '违章押金', icon: '🚗', color: '#FAAD14', path: '/pages/user/violation' },
  { name: '续租记录', icon: '🔄', color: '#722ED1', path: '/pages/user/renewal' },
]

// ==================== 方法 ====================

function toggleBalance() {
  showBalance.value = !showBalance.value
}

async function loadWalletInfo() {
  try {
    const res = await getWalletInfo()
    walletInfo.value = res.data
  } catch (e) {
    // 静默处理
  }
}

async function loadRecentTransactions() {
  try {
    const res = await getWalletTransactions({ page: 1, size: 10 })
    transactions.value = res.data?.list || []
  } catch (e) {
    // 静默处理
  }
}

function goRecharge() {
  uni.showActionSheet({
    itemList: ['充值 ¥50', '充值 ¥100', '充值 ¥200', '充值 ¥500'],
    success: async (res) => {
      const amounts = [50, 100, 200, 500]
      const amountCents = amounts[res.tapIndex] * 100
      uni.showLoading({ title: '创建支付订单...' })
      try {
        const result = await rechargeWallet({ amountCents })
        uni.hideLoading()
        // 跳转到支付页
        uni.navigateTo({
          url: `/pages/payment/index?paymentNo=${result.data.paymentNo}`,
        })
      } catch {
        uni.hideLoading()
      }
    },
  })
}

import { rechargeWallet } from '@/api/wallet'

function goTransactions() {
  uni.navigateTo({ url: '/pages/user/wallet-transactions' })
}

function navigateTo(path: string) {
  if (path) uni.navigateTo({ url: path })
  else goRecharge()
}

function getTxIcon(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: '充',
    PAY: '支',
    REFUND: '退',
    DEDUCTION: '扣',
    REBATE: '返',
  }
  return map[type] || '账'
}

function getTypeName(type: string): string {
  const map: Record<string, string> = {
    RECHARGE: '账户充值',
    PAY: '订单支付',
    REFUND: '退款到账',
    DEDUCTION: '违章扣除',
    REBATE: '违章退还',
  }
  return map[type] || '其他变动'
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

// ==================== 生命周期 ====================

onShow(() => {
  loadWalletInfo()
  loadRecentTransactions()
})
</script>

<style lang="scss" scoped>
.wallet-page {
  min-height: 100vh;
  background: #f5f7fa;
}

// 钱包主卡片 — 渐变背景
.wallet-card {
  margin: 24rpx;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 24rpx;
  color: #fff;
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wallet-label {
  font-size: 26rpx;
  opacity: 0.85;
}

.eye-toggle {
  padding: 8rpx;
}

.eye-icon {
  width: 36rpx;
  height: 36rpx;
  opacity: 0.8;
}

.wallet-amount {
  display: block;
  margin-top: 16rpx;
  font-size: 64rpx;
  font-weight: 700;
  letter-spacing: -2rpx;
}

.wallet-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.75;
}

.wallet-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 36rpx;
}

.btn-recharge {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  background: #fff;
  color: #1890ff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 36rpx;
  border: none;

  &::after {
    display: none;
  }
}

.btn-plain {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 28rpx;
  border-radius: 36rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.4);

  &::after {
    display: none;
  }
}

// 快捷功能区
.quick-section {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
  margin-top: 28rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.quick-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 36rpx;
}

.quick-name {
  font-size: 23rpx;
  color: #666;
}

// 交易流水
.transaction-section {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.more-link {
  font-size: 25rpx;
  color: #1890ff;
}

.transaction-list {
  margin-top: 16rpx;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.tx-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.tx-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
  background: #bbb;

  &.tx-in {
    background: #52c41a;
  }

  &.tx-out {
    background: #ff4d4f;
  }
}

.tx-remark {
  font-size: 27rpx;
  color: #333;
  display: block;
}

.tx-time {
  font-size: 23rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.tx-amount {
  font-size: 30rpx;
  font-weight: 600;
}

.amount-in {
  color: #52c41a;
}

.amount-out {
  color: #ff4d4f;
}

.empty-state {
  padding: 60rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>
