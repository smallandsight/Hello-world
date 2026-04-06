<template>
  <view class="activity-detail-page">
    <!-- 活动封面 -->
    <image class="activity-cover" :src="activity.cover" mode="aspectFill" />

    <!-- 活动信息 -->
    <view class="activity-header">
      <view class="activity-title-row">
        <text class="activity-title">{{ activity.name }}</text>
        <view class="activity-tag" :class="`tag-${activity.type}`">
          {{ getTypeName(activity.type) }}
        </view>
      </view>
      <view class="activity-time">
        <text class="iconfont icon-clock"></text>
        <text>{{ activity.startTime }} - {{ activity.endTime }}</text>
      </view>
      <view class="activity-stats">
        <text class="stats-item">{{ activity.participantCount }}人参与</text>
        <text class="stats-divider">|</text>
        <text class="stats-item">剩余{{ activity.remaining }}名额</text>
      </view>
    </view>

    <!-- 活动详情 -->
    <view class="activity-section">
      <view class="section-title">活动详情</view>
      <view class="activity-desc">{{ activity.description }}</view>
      <view class="activity-rules">
        <view class="rule-item" v-for="(rule, index) in activity.rules" :key="index">
          <view class="rule-dot"></view>
          <text class="rule-text">{{ rule }}</text>
        </view>
      </view>
    </view>

    <!-- 优惠内容 -->
    <view class="activity-section" v-if="activity.discount">
      <view class="section-title">优惠内容</view>
      <view class="discount-card">
        <view class="discount-value">
          <text class="discount-number">{{ activity.discount.value }}</text>
          <text class="discount-unit">{{ activity.discount.unit }}</text>
        </view>
        <view class="discount-info">
          <text class="discount-title">{{ activity.discount.title }}</text>
          <text class="discount-desc">{{ activity.discount.desc }}</text>
        </view>
        <view class="discount-action">
          <view class="btn-use" @tap="useDiscount">立即使用</view>
        </view>
      </view>
    </view>

    <!-- 适用范围 -->
    <view class="activity-section" v-if="activity.scope">
      <view class="section-title">适用范围</view>
      <view class="scope-list">
        <view class="scope-item" v-for="(item, index) in activity.scope" :key="index">
          <text class="iconfont icon-check"></text>
          <text class="scope-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 活动规则 -->
    <view class="activity-section">
      <view class="section-title">活动规则</view>
      <view class="rules-list">
        <view class="rule-row" v-for="(rule, index) in activity.detailRules" :key="index">
          <text class="rule-index">{{ index + 1 }}.</text>
          <text class="rule-content">{{ rule }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="btn-share" @tap="shareActivity">
        <text class="iconfont icon-share"></text>
        <text>分享</text>
      </view>
      <view class="btn-participate" @tap="participateActivity">
        {{ activity.hasJoined ? '已参与' : '立即参与' }}
      </view>
    </view>

    <!-- 分享弹窗 -->
    <view v-if="showSharePanel" class="share-mask" @tap="showSharePanel = false">
      <view class="share-panel" @tap.stop>
        <view class="share-title">分享活动</view>
        <view class="share-options">
          <button class="share-option" open-type="share">
            <image class="share-icon" src="/static/images/share-wechat.png" />
            <text class="share-label">微信好友</text>
          </button>
          <view class="share-option" @tap="shareToTimeline">
            <image class="share-icon" src="/static/images/share-timeline.png" />
            <text class="share-label">朋友圈</text>
          </view>
          <view class="share-option" @tap="copyLink">
            <image class="share-icon" src="/static/images/share-link.png" />
            <text class="share-label">复制链接</text>
          </view>
        </view>
        <view class="share-cancel" @tap="showSharePanel = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ---------- 活动详情 ----------
const activity = ref({
  id: '',
  name: '清明小长假限时特价',
  type: 'flash_sale',
  cover: '/static/images/activity/sale-detail.png',
  startTime: '2026-04-04',
  endTime: '2026-04-06',
  description: '清明小长假出行，热门车型低至7折，限时抢购，先到先得！',
  participantCount: 1256,
  remaining: 500,
  hasJoined: false,
  rules: [
    '活动期间，指定车型租金享受折扣优惠',
    '每个用户限参与1次',
    '优惠券有效期为7天',
  ],
  discount: {
    value: '7',
    unit: '折',
    title: '热门车型7折起',
    desc: '限时特价，先到先得',
  },
  scope: [
    '小牛NQi Pro',
    '雅迪DE3',
    '九号C90',
    '小牛MQi2',
  ],
  detailRules: [
    '活动时间：2026年4月4日00:00至2026年4月6日23:59',
    '活动期间，用户在指定门店租用指定车型可享折扣优惠',
    '每位用户仅限参与一次，不可与其他优惠叠加使用',
    '优惠券自领取之日起7天内有效，过期作废',
    '本活动最终解释权归古月租车所有',
  ],
})

const showSharePanel = ref(false)

// ---------- 生命周期 ----------
onMounted(() => {
  // 获取活动ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  activity.value.id = options.id || 'A001'
  loadActivityDetail()
})

function loadActivityDetail(): void {
  console.log('加载活动详情:', activity.value.id)
}

// ---------- 方法 ----------
function getTypeName(type: string): string {
  const map: Record<string, string> = {
    flash_sale: '限时特价',
    discount: '满减',
    new_user: '新人专享',
    member_only: '会员专享',
    invitation: '邀请有礼',
  }
  return map[type] || '活动'
}

function useDiscount(): void {
  if (activity.value.hasJoined) {
    uni.showToast({ title: '您已参与活动', icon: 'none' })
    return
  }
  uni.showToast({ title: '优惠券已发放', icon: 'success' })
  activity.value.hasJoined = true
}

function shareActivity(): void {
  showSharePanel.value = true
}

function shareToTimeline(): void {
  uni.showToast({ title: '请使用右上角分享', icon: 'none' })
  showSharePanel.value = false
}

function copyLink(): void {
  uni.setClipboardData({
    data: `https://gybike.com/activity/${activity.value.id}`,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
      showSharePanel.value = false
    }
  })
}

function participateActivity(): void {
  if (activity.value.hasJoined) {
    uni.showToast({ title: '您已参与活动', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认参与',
    content: '参与活动后将获得优惠券，确认参与吗？',
    success: (res) => {
      if (res.confirm) {
        activity.value.hasJoined = true
        uni.showToast({ title: '参与成功', icon: 'success' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.activity-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

// ========== 封面 ==========
.activity-cover {
  width: 100%;
  height: 400rpx;
}

// ========== 头部信息 ==========
.activity-header {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.activity-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.activity-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  flex: 1;
}

.activity-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  color: #fff;
  &.tag-flash_sale { background: linear-gradient(135deg, #ff4d4f, #ff7875); }
  &.tag-discount { background: linear-gradient(135deg, #faad14, #ffc53d); }
  &.tag-new_user { background: linear-gradient(135deg, #52c41a, #73d13d); }
  &.tag-member_only { background: linear-gradient(135deg, #1890ff, #40a9ff); }
}

.activity-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.activity-stats {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 24rpx;
  color: #999;
}

.stats-divider {
  color: #ddd;
}

// ========== 区块 ==========
.activity-section {
  background: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1890ff;
}

.activity-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

// ========== 活动规则 ==========
.activity-rules {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.rule-dot {
  width: 12rpx;
  height: 12rpx;
  background: #1890ff;
  border-radius: 50%;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

// ========== 优惠卡片 ==========
.discount-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #fff7e6, #fffbe6);
  border: 2rpx dashed #faad14;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 16rpx;
}

.discount-value {
  display: flex;
  align-items: baseline;
  margin-right: 20rpx;
}

.discount-number {
  font-size: 56rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.discount-unit {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-left: 4rpx;
}

.discount-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.discount-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.discount-desc {
  font-size: 22rpx;
  color: #999;
}

.btn-use {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  font-size: 26rpx;
  padding: 16rpx 32rpx;
  border-radius: 30rpx;
}

// ========== 适用范围 ==========
.scope-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.scope-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #52c41a;
}

.scope-text {
  color: #666;
}

// ========== 规则列表 ==========
.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rule-row {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}

.rule-index {
  color: #1890ff;
  flex-shrink: 0;
}

// ========== 底部操作栏 ==========
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.btn-share {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #666;
}

.btn-participate {
  flex: 1;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
}

// ========== 分享弹窗 ==========
.share-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.share-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.share-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  padding: 30rpx;
}

.share-options {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  background: transparent;
  border: none;
  padding: 0;

  &::after {
    border: none;
  }
}

.share-icon {
  width: 96rpx;
  height: 96rpx;
}

.share-label {
  font-size: 24rpx;
  color: #666;
}

.share-cancel {
  font-size: 30rpx;
  color: #999;
  text-align: center;
  padding: 30rpx;
  border-top: 1rpx solid #eee;
}
</style>