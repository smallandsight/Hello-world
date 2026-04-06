<template>
  <view class="page-message">
    <!-- 顶部：全部 / 未读 -->
    <view class="msg-header">
      <text :class="['header-tab', { active: onlyUnread }]" @click="onlyUnread = false">全部消息</text>
      <text :class="['header-tab', { active: onlyUnread }]" @click="onlyUnread = true">未读({{ unreadCount }})</text>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y class="msg-scroll">
      <view v-if="!messages.length && !loading" class="empty">暂无消息</view>
      <view v-for="(msg, idx) in messages" :key="idx"
        :class="['msg-item', { unread: !msg.isRead }]"
        @click="goDetail(msg)"
      >
        <view class="msg-icon-wrap">
          <text>{{ msgTypeIcon(msg.type) }}</text>
        </view>
        <view class="msg-body">
          <view class="msg-top">
            <text class="msg-title">{{ msg.title }}</text>
            <text class="msg-time">{{ formatRelative(msg.createdAt) }}</text>
          </view>
          <text class="msg-desc">{{ msg.content || '点击查看详情' }}</text>
        </view>
        <view class="dot" v-if="!msg.isRead"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as msgApi from '@/api/message'
import type { MessageItem } from '@/types/coupon'
import { formatRelativeTime } from '@/utils/format'

const onlyUnread = ref(false)
const unreadCount = ref(0)
const messages = ref<MessageItem[]>([])
const loading = ref(false)

onShow(() => { fetchMessages(); fetchUnreadCount() })

async function fetchMessages() {
  loading.value = true
  try {
    const res = await msgApi.getMessageList({}, 1, 50)
    messages.value = res.data?.list || []
  } catch {} finally { loading.value = false }
}

async function fetchUnreadCount() {
  try {
    const res = await msgApi.getUnreadCount()
    unreadCount.value = res.data.count
  } catch {}
}

function goDetail(msg: MessageItem) {
  // 标记已读 + 跳转详情（或展开内容）
  if (!msg.isRead) {
    msgApi.markAsRead(msg.id)
    msg.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  // TODO: 消息详情页或弹窗展示
  uni.showModal({
    title: msg.title,
    content: msg.content || '无详细内容',
    showCancel: false,
  })
}

function msgTypeIcon(type: string): string {
  const map: Record<string, string> = {
    order_status: '📋', system: '📢', marketing: '🎁', coupon: '🎫',
  }
  return map[type] || '📌'
}
</script>

<style lang="scss" scoped>
.msg-header { display: flex; gap: 32rpx; padding: 24rpx; background: var(--bg-primary);
  .header-tab { font-size: 28rpx; color: var(--text-secondary);
    &.active { color: var(--primary-color); font-weight: 600; border-bottom: 2rpx solid var(--primary-color); padding-bottom: 12rpx; }
  }
}
.msg-scroll { flex: 1; height: calc(100vh - 120rpx); padding: 0 24rpx; }
.msg-item {
  display: flex; gap: 16rpx; padding: 24rpx; background: var(--bg-primary);
  border-radius: 14rpx; margin-bottom: 16rpx; position: relative;

  &:active { background: #fafafa; }
  &.unread { background: #e6f7ff; }

  .msg-icon-wrap { width: 64rpx; height: 64rpx; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }

  .msg-body { flex: 1;
    .msg-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx;
      .msg-title { font-size: 28rpx; font-weight: 500; color: var(--text-primary); max-width: 450rpx; }
      .msg-time { font-size: 22rpx; color: var(--text-tertiary); flex-shrink: 0; }
    }
    .msg-desc { font-size: 24rpx; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  }

  .dot { position: absolute; top: 24rpx; right: 24rpx; width: 14rpx; height: 14rpx; background: #f5222d; border-radius: 50%; }
}
.empty { text-align: center; padding-top: 200rpx; font-size: 28rpx; color: var(--text-tertiary); }
</style>
