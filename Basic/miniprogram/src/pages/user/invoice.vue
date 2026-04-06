<template>
  <view class="invoice-page">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 抬头管理 Tab -->
    <view v-if="currentTab === 'titles'" class="tab-content">
      <!-- 新增抬头按钮 -->
      <view class="add-btn-row">
        <button class="add-title-btn" @click="showAddTitle = true">
          + 新增抬头
        </button>
      </view>

      <!-- 抬头列表 -->
      <view v-if="titleList.length > 0" class="title-list">
        <view
          v-for="item in titleList"
          :key="item.id"
          class="title-card"
        >
          <view class="title-main">
            <view class="title-type" :class="item.type === 'COMPANY' ? 'company' : 'personal'">
              {{ item.type === 'COMPANY' ? '企业' : '个人' }}
            </view>
            <text class="title-name">{{ item.name }}</text>
            <view v-if="item.isDefault" class="default-tag">默认</view>
          </view>
          <view v-if="item.taxNo" class="title-detail">
            税号：{{ item.taxNo }}
          </view>
          <view class="title-actions">
            <button
              class="action-btn edit"
              @click="editTitle(item)"
            >编辑</button>
            <button
              class="action-btn delete"
              @click="deleteTitle(item.id)"
            >删除</button>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text>暂无发票抬头，点击上方添加</text>
      </view>
    </view>

    <!-- 发票记录 Tab -->
    <scroll-view
      v-else
      scroll-y
      class="tab-content scroll-content"
      @scrolltolower="loadMoreInvoices"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefreshInvoice"
    >
      <view v-if="invoiceList.length > 0" class="invoice-list">
        <view
          v-for="item in invoiceList"
          :key="item.id"
          class="invoice-card"
          @click="goInvoiceDetail(item.id)"
        >
          <view class="invoice-top">
            <text class="invoice-title">{{ item.titleName }}</text>
            <view
              class="invoice-status"
              :class="getStatusClass(item.status)"
            >
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <view class="invoice-info">
            <text class="info-label">订单金额：</text>
            <text class="info-value">¥{{ (item.amountCents / 100).toFixed(2) }}</text>
          </view>
          <view class="invoice-info">
            <text class="info-label">申请时间：</text>
            <text class="info-value">{{ formatDate(item.createdAt) }}</text>
          </view>
          <view v-if="item.invoiceNo" class="invoice-info">
            <text class="info-label">发票号码：</text>
            <text class="info-value">{{ item.invoiceNo }}</text>
          </view>
        </view>

        <view v-if="hasMoreInv" class="load-more">加载中...</view>
        <view v-else-if="invPage > 1" class="no-more">— 没有更多了 —</view>
      </view>
      <view v-else class="empty-state">
        <text>暂无发票记录，完成订单后可申请开票</text>
      </view>
    </scroll-view>

    <!-- 新增/编辑抬头弹窗 -->
    <view v-if="showAddTitle || editingTitle" class="modal-mask" @click="closeModal">
      <view class="modal-content" @click.stop>
        <text class="modal-title">{{ editingTitle ? '编辑抬头' : '新增抬头' }}</text>

        <!-- 抬头类型 -->
        <view class="form-group">
          <text class="form-label">类型 *</text>
          <view class="type-switch">
            <view
              class="type-option"
              :class="{ active: form.type === 'PERSONAL' }"
              @click="form.type = 'PERSONAL'"
            >个人</view>
            <view
              class="type-option"
              :class="{ active: form.type === 'COMPANY' }"
              @click="form.type = 'COMPANY'"
            >企业</view>
          </view>
        </view>

        <!-- 名称 -->
        <view class="form-group">
          <text class="form-label">{{ form.type === 'COMPANY' ? '企业名称' : '姓名' }} *</text>
          <input
            v-model="form.name"
            class="form-input"
            :placeholder="form.type === 'COMPANY' ? '请输入企业名称' : '请输入姓名'"
          />
        </view>

        <!-- 企业税号 -->
        <view v-if="form.type === 'COMPANY'" class="form-group">
          <text class="form-label">纳税人识别号 *</text>
          <input
            v-model="form.taxNo!"
            class="form-input"
            placeholder="请输入税号"
          />
        </view>

        <!-- 可选字段 -->
        <view class="form-group">
          <text class="form-label">手机号</text>
          <input v-model="form.phone!" class="form-input" placeholder="选填" />
        </view>
        <view class="form-group">
          <text class="form-label">邮箱（用于接收电子发票）</text>
          <input v-model="form.email!" class="form-input" placeholder="选填" />
        </view>

        <view class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-confirm" @click="submitTitle">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getInvoiceTitles,
  createInvoiceTitle,
  updateInvoiceTitle,
  deleteTitle as apiDeleteTitle,
  getInvoiceList,
} from '@/api/invoice'
import type { InvoiceTitle, Invoice, InvoiceStatus } from '@/types/extended'

// ==================== 状态 ====================

const currentTab = ref<'titles' | 'records'>('titles')
const tabs = [
  { key: 'titles' as const, label: '发票抬头' },
  { key: 'records' as const, label: '开票记录' },
]

const titleList = ref<InvoiceTitle[]>([])
const invoiceList = ref<Invoice[]>([])
const showAddTitle = ref(false)
const editingTitle = ref<InvoiceTitle | null>(null)

// 分页
const invPage = ref(1)
const hasMoreInv = ref(true)
const refreshing = ref(false)

// 表单
const form = reactive({
  type: 'PERSONAL' as 'COMPANY' | 'PERSONAL',
  name: '',
  taxNo: '',
  phone: '',
  email: '',
})

// ==================== 方法 ====================

function switchTab(key: 'titles' | 'records') {
  currentTab.value = key
  if (key === 'records' && invoiceList.value.length === 0) {
    loadInvoices(true)
  }
}

async function loadTitles() {
  try {
    const res = await getInvoiceTitles()
    titleList.value = res.data || []
  } catch (e) {
    console.error('加载抬头失败:', e)
  }
}

async function loadInvoices(reset = false) {
  try {
    if (reset) invPage.value = 1
    const res = await getInvoiceList({ page: invPage.value, size: 20 })
    const list = res.data?.list || []
    if (reset) invoiceList.value = list
    else invoiceList.value = [...invoiceList.value, ...list]
    hasMoreInv.value = invoiceList.value.length < (res.data?.total || 0)
    invPage.value++
  } catch (e) {
    console.error('加载发票记录失败:', e)
  }
}

function loadMoreInvoices() {
  if (!hasMoreInv.value) return
  loadInvoices()
}

async function onRefreshInvoice() {
  refreshing.value = true
  await loadInvoices(true)
}

function editTitle(item: InvoiceTitle) {
  editingTitle.value = item
  form.type = item.type
  form.name = item.name
  form.taxNo = item.taxNo || ''
  form.phone = item.phone || ''
  form.email = item.email || ''
}

function closeModal() {
  showAddTitle.value = false
  editingTitle.value = null
  resetForm()
}

function resetForm() {
  form.type = 'PERSONAL'
  form.name = ''
  form.taxNo = ''
  form.phone = ''
  form.email = ''
}

async function submitTitle() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请填写名称', icon: 'none' })
    return
  }

  // 企业必须填税号
  if (form.type === 'COMPANY' && !form.taxNo.trim()) {
    uni.showToast({ title: '请填写税号', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  try {
    if (editingTitle.value) {
      await updateInvoiceTitle(editingTitle.value.id, { ...form })
      uni.showToast({ title: '修改成功', icon: 'success' })
    } else {
      await createInvoiceTitle({ ...form })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    closeModal()
    await loadTitles()
  } catch (e) {
    console.error('保存抬头失败:', e)
  } finally {
    uni.hideLoading()
  }
}

function deleteTitle(id: number) {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiDeleteTitle(id)
          uni.showToast({ title: '已删除', icon: 'success' })
          await loadTitles()
        } catch (e) {
          // 已由拦截器处理 toast
        }
      }
    },
  })
}

function goInvoiceDetail(id: number) {
  // 可跳转详情或弹窗展示
  uni.navigateTo({ url: `/pages/user/invoice-detail?id=${id}` })
}

function getStatusText(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    PENDING: '待开票',
    ISSUED: '已开具',
    SENT: '已邮寄',
    DELIVERED: '已交付',
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  return `status-${status.toLowerCase()}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ==================== 生命周期 ====================

onShow(() => {
  loadTitles()
})
</script>

<style lang="scss" scoped>
.invoice-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.tab-bar {
  display: flex;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;

  &.active {
    color: #1890ff;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80rpx;
      height: 4rpx;
      background: #1890ff;
      border-radius: 2rpx;
    }
  }
}

.tab-content {
  flex: 1;
}

.scroll-content {
  height: calc(100vh - 88rpx);
}

.add-btn-row {
  padding: 24rpx;
}

.add-title-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #1890ff;
  color: #fff;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;

  &::after {
    display: none;
  }
}

// 抬头卡片
.title-list {
  padding: 0 24rpx;
}

.title-card {
  margin-bottom: 20rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 12rpx;
}

.title-main {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.title-type {
  font-size: 21rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;

  &.company {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.personal {
    background: #f6ffed;
    color: #52c41a;
  }
}

.title-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.default-tag {
  font-size: 21rpx;
  color: #faad14;
  background: #fffbe6;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.title-detail {
  margin-top: 10rpx;
  font-size: 25rpx;
  color: #888;
}

.title-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 18rpx;
}

.action-btn {
  font-size: 25rpx;
  padding: 8rpx 28rpx;
  border-radius: 8rpx;
  line-height: 1.6;
  border: none;

  &::after {
    display: none;
  }

  &.edit {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.delete {
    background: #fff2f0;
    color: #ff4d4f;
  }
}

// 发票卡片
.invoice-list {
  padding: 24rpx;
}

.invoice-card {
  padding: 28rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.invoice-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.invoice-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.invoice-status {
  font-size: 23rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;

  .status-pending {
    background: #fff7e6;
    color: #faad14;
  }

  .status-issued {
    background: #e6f7ff;
    color: #1890ff;
  }

  .status-sent {
    background: #f6ffed;
    color: #52c41a;
  }

  .status-delivered {
    background: #f9f0ff;
    color: #722ed1;
  }
}

.invoice-info {
  margin-top: 12rpx;
  font-size: 25rpx;
  color: #666;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
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
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  font-size: 26rpx;
  color: #999;
}

// 弹窗
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.modal-content {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 36rpx;
}

.form-group {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 27rpx;
}

.type-switch {
  display: flex;
  gap: 16rpx;
}

.type-option {
  flex: 1;
  text-align: center;
  height: 72rpx;
  line-height: 72rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 27rpx;
  color: #666;

  &.active {
    border-color: #1890ff;
    color: #1890ff;
    background: #e6f7ff;
  }
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 10rpx;
  font-size: 29rpx;
  border: none;

  &::after {
    display: none;
  }
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #1890ff;
  color: #fff;
}
</style>
