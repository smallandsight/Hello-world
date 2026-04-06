<template>
  <view v-if="ticket" class="detail-page">
    <!-- 状态卡片 -->
    <view class="status-card" :class="`s-${ticket.status.toLowerCase()}`">
      <view class="sc-top">
        <text class="sc-title">{{ ticket.title }}</text>
        <view class="sc-status">{{ getStatusText(ticket.status) }}</view>
      </view>
      <view class="sc-meta">
        <text>{{ getCategoryName(ticket.category) }} · {{ formatFullTime(ticket.createdAt) }}</text>
      </view>
    </view>

    <!-- 工单信息 -->
    <view class="info-section">
      <view class="info-row">
        <text class="label">工单编号</text>
        <text class="value">#{{ ticket.id }}</text>
      </view>
      <view class="info-row">
        <text class="label">优先级</text>
        <text class="value priority">{{ getPriorityName(ticket.priority) }}</text>
      </view>
      <view v-if="ticket.assigneeName" class="info-row">
        <text class="label">处理人</text>
        <text class="value">{{ ticket.assigneeName }}</text>
      </view>
      <view v-if="ticket.resolvedAt" class="info-row">
        <text class="label">解决时间</text>
        <text class="value">{{ formatFullTime(ticket.resolvedAt) }}</text>
      </view>
    </view>

    <!-- 描述内容 -->
    <view class="content-section">
      <view class="section-title">问题描述</view>
      <text class="content-text">{{ ticket.content }}</text>
      <view v-if="ticket.images && ticket.images.length" class="content-images">
        <image
          v-for="(img, idx) in ticket.images"
          :key="idx"
          :src="img"
          class="content-img"
          mode="aspectFill"
          @click="previewImages(ticket.images!, idx)"
        />
      </view>
    </view>

    <!-- 对话记录 -->
    <view class="replies-section">
      <view class="section-title">
        对话记录 ({{ replies.length }})
      </view>

      <scroll-view scroll-y class="replies-scroll">
        <view v-if="replies.length === 0" class="no-reply">
          暂无对话记录
        </view>
        <view
          v-for="(reply, index) in replies"
          :key="index"
          class="reply-item"
          :class="{ self: reply.senderType === 'USER' }"
        >
          <view class="reply-avatar">
            <text class="avatar-icon">
              {{ reply.senderType === 'STAFF' ? '👨‍💼' : reply.senderType === 'SYSTEM' ? '🤖' : '👤' }}
            </text>
          </view>
          <view class="reply-bubble">
            <text class="reply-sender">{{ reply.senderName || (reply.senderType === 'USER' ? '我' : reply.senderType) }}</text>
            <text class="reply-content">{{ reply.content }}</text>
            <view v-if="reply.images?.length" class="reply-images">
              <image
                v-for="(img, ri) in reply.images"
                :key="ri"
                :src="img"
                class="reply-img"
                mode="aspectFill"
                @click="previewImages(reply.images!, ri)"
              />
            </view>
            <text class="reply-time">{{ formatFullTime(reply.createdAt) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 追加回复输入框 -->
    <view class="reply-input-bar">
      <input
        v-model="replyContent"
        class="reply-input"
        placeholder="追加回复..."
        confirm-type="send"
        @confirm="sendReply"
      />
      <button class="btn-send" @click="sendReply">发送</button>
    </view>
  </view>

  <!-- 加载中 -->
  <view v-else class="loading-state">
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTicketDetail, addTicketReply } from '@/api/ticket'
import type { Ticket, TicketReply } from '@/types/extended'

// ==================== 状态 ====================

const ticketId = ref(0)
const ticket = ref<(Ticket & { replies?: TicketReply[] }) | null>(null)
const replies = ref<TicketReply[]>([])
const replyContent = ref('')

// ==================== 方法 ====================

async function loadDetail() {
  try {
    const res = await getTicketDetail(ticketId.value)
    ticket.value = res.data
    replies.value = res.data.replies || []
  } catch (e) {
    console.error('加载工单详情失败:', e)
  }
}

async function sendReply() {
  const content = replyContent.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  try {
    await addTicketReply(ticketId.value, { content })
    replyContent.value = ''
    uni.showToast({ title: '发送成功', icon: 'none' })
    // 刷新
    await loadDetail()
  } catch (e) {
    console.error('发送回复失败:', e)
  }
}

function previewImages(images: string[], idx: number) {
  uni.previewImage({
    urls: images,
    current: String(idx),
  })
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待受理',
    PROCESSING: '处理中',
    WAITING_USER: '待您补充',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
    REJECTED: '已拒绝',
    REOPENED: '重新打开',
  }
  return map[status] || status
}

function getCategoryName(cat: string): string {
  const map: Record<string, string> = {
    order_issue: '订单问题',
    payment: '支付纠纷',
    vehicle: '车辆问题',
    refund: '退款申请',
    account: '账号问题',
    suggestion: '建议投诉',
    accident: '事故纠纷',
    other: '其他',
  }
  return map[cat] || cat
}

function getPriorityName(priority: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }
  return map[priority] || priority
}

function formatFullTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

// ==================== 生命周期 ====================
onLoad((query) => {
  if (query?.id) ticketId.value = Number(query.id)
  loadDetail()
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 130rpx; // 为底部输入框留空
}

// 状态卡
.status-card {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  color: #fff;

  &.s-pending { background: linear-gradient(135deg, #faad14, #d48806); }
  &.s-processing { background: linear-gradient(135deg, #1890ff, #096dd9); }
  &.s-waiting_user { background: linear-gradient(135deg, #722ed1, #531dab); }
  &.s-resolved { background: linear-gradient(135deg, #52c41a, #389e0d); }
  &.s-closed, &.s-rejected { background: linear-gradient(135deg, #8c8c8c, #595959); }
  &.s-reopened { background: linear-gradient(135deg, #a0d911, #7cb305); }
}

.sc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.sc-title {
  font-size: 32rpx;
  font-weight: 700;
  flex: 1;
}

.sc-status {
  font-size: 23rpx;
  padding: 6rpx 14rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 8rpx;
  white-space: nowrap;
}

.sc-meta {
  margin-top: 14rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

// 信息区
.info-section {
  margin: 0 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 14rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid #f5f5f5;
  }

  .label { font-size: 26rpx; color: #888; }
  .value { font-size: 26rpx; color: #333; font-weight: 500; }
  .priority { color: #faad14; }
}

// 内容区
.content-section {
  margin: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 14rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.content-text {
  font-size: 27rpx;
  color: #555;
  line-height: 1.65;
  word-break: break-all;
}

.content-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.content-img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 10rpx;
}

// 对话区
.replies-section {
  margin: 0 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 14rpx;
}

.replies-scroll {
  max-height: 600rpx;
}

.no-reply {
  text-align: center;
  padding: 40rpx;
  color: #bbb;
  font-size: 26rpx;
}

.reply-item {
  display: flex;
  gap: 14rpx;
  margin-bottom: 24rpx;

  &.self {
    flex-direction: row-reverse;

    .reply-bubble {
      background: #e6f7ff;
      align-items: flex-end;
    }
  }
}

.reply-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 36rpx;
}

.reply-bubble {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  background: #f5f5f5;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
}

.reply-sender {
  font-size: 22rpx;
  color: #999;
}

.reply-content {
  font-size: 27rpx;
  color: #333;
  line-height: 1.55;
}

.reply-images {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.reply-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 8rpx;
}

.reply-time {
  font-size: 21rpx;
  color: #bbb;
}

// 底部输入栏
.reply-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.reply-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 36rpx;
  font-size: 26rpx;
  background: #f9f9f9;
}

.btn-send {
  width: 120rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #1890ff;
  color: #fff;
  font-size: 26rpx;
  border-radius: 36rpx;
  border: none;

  &::after { display: none; }
}

.loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  font-size: 28rpx;
  color: #999;
}
</style>
