<template>
  <div class="tools-template-container">
    <!-- 模板类型选择 -->
    <el-card shadow="hover" class="template-types-card">
      <template #header>
        <span>消息模板管理</span>
      </template>
      <el-tabs v-model="activeType">
        <el-tab-pane label="全部模板" name="all" />
        <el-tab-pane label="订单通知" name="order" />
        <el-tab-pane label="支付通知" name="payment" />
        <el-tab-pane label="活动通知" name="activity" />
        <el-tab-pane label="系统通知" name="system" />
      </el-tabs>
    </el-card>

    <!-- 模板列表 -->
    <el-card shadow="hover" class="template-list-card">
      <template #header>
        <div class="card-header">
          <span>模板列表</span>
          <el-button type="primary" :icon="Plus" @click="showCreateDialog">新建模板</el-button>
        </div>
      </template>

      <el-table :data="filteredTemplates" stripe style="width: 100%">
        <el-table-column prop="code" label="模板编码" width="180" />
        <el-table-column prop="title" label="模板标题" width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="模板内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="channel" label="发送渠道" width="120">
          <template #default="{ row }">
            <el-tag v-for="ch in row.channel.split(',')" :key="ch" size="small" effect="plain" style="margin-right: 4px;">
              {{ getChannelLabel(ch) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.status" active-value="active" inactive-value="inactive" />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editTemplate(row)">编辑</el-button>
            <el-button type="primary" link size="small" @click="previewTemplate(row)">预览</el-button>
            <el-button type="danger" link size="small" @click="deleteTemplate(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑模板弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新建模板'" width="650px">
      <el-form :model="templateForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="模板编码" prop="code">
          <el-input v-model="templateForm.code" placeholder="如：ORDER_CREATED" :disabled="isEdit" style="width: 400px;" />
        </el-form-item>
        <el-form-item label="模板标题" prop="title">
          <el-input v-model="templateForm.title" placeholder="请输入模板标题" style="width: 400px;" />
        </el-form-item>
        <el-form-item label="模板类型" prop="type">
          <el-select v-model="templateForm.type" placeholder="选择类型" style="width: 400px;">
            <el-option label="订单通知" value="order" />
            <el-option label="支付通知" value="payment" />
            <el-option label="活动通知" value="activity" />
            <el-option label="系统通知" value="system" />
          </el-select>
        </el-form-item>
        <el-form-item label="发送渠道" prop="channel">
          <el-checkbox-group v-model="templateForm.channels">
            <el-checkbox value="sms">短信</el-checkbox>
            <el-checkbox value="push">App推送</el-checkbox>
            <el-checkbox value="wechat">微信订阅消息</el-checkbox>
            <el-checkbox value="alipay">支付宝订阅消息</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="templateForm.content"
            type="textarea"
            :rows="5"
            placeholder="支持变量：{userName}、{orderNo}、{amount} 等"
            style="width: 400px;"
          />
          <div class="content-tip">
            <p>可用变量：</p>
            <el-tag size="small" v-for="v in variables" :key="v" @click="insertVariable(v)" style="margin: 2px; cursor: pointer;">
              {{ v }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="模板预览" width="500px">
      <div class="preview-container">
        <div class="preview-header">
          <span class="preview-title">{{ previewData.title }}</span>
          <el-tag size="small" effect="plain">{{ getChannelLabel(previewData.channel) }}</el-tag>
        </div>
        <div class="preview-content">
          {{ previewData.renderedContent }}
        </div>
        <div class="preview-footer">
          <span class="preview-time">发送时间：{{ new Date().toLocaleString() }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

// ---------- 模板类型 ----------
const activeType = ref('all')

// ---------- 模板列表 ----------
interface TemplateItem {
  id: string
  code: string
  title: string
  type: string
  content: string
  channel: string
  status: string
  updatedAt: string
}

const templateList = ref<TemplateItem[]>([
  { id: 'T001', code: 'ORDER_CREATED', title: '订单创建通知', type: 'order', content: '尊敬的{userName}，您的订单{orderNo}已创建成功，请及时支付。', channel: 'sms,push', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T002', code: 'ORDER_PAID', title: '订单支付成功', type: 'payment', content: '尊敬的{userName}，您的订单{orderNo}已支付成功，金额{amount}元。', channel: 'sms,push,wechat', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T003', code: 'ORDER_PICKUP_REMIND', title: '取车提醒', type: 'order', content: '尊敬的{userName}，您的订单{orderNo}即将到取车时间，请前往{storeName}取车。', channel: 'sms,push', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T004', code: 'ORDER_RETURN_REMIND', title: '还车提醒', type: 'order', content: '尊敬的{userName}，您的订单{orderNo}即将到还车时间，请按时还车。', channel: 'sms,push', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T005', code: 'ACTIVITY_INVITE', title: '活动邀请通知', type: 'activity', content: '亲爱的用户，{activityName}活动火热进行中，快来参与吧！', channel: 'push,wechat', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T006', code: 'COUPON_RECEIVED', title: '优惠券到账通知', type: 'activity', content: '恭喜{userName}，您获得了一张{couponName}优惠券，有效期至{expireDate}。', channel: 'push', status: 'active', updatedAt: '2026-04-05 10:30' },
  { id: 'T007', code: 'SYSTEM_NOTICE', title: '系统公告', type: 'system', content: '尊敬的用户，{noticeContent}', channel: 'sms,push,wechat,alipay', status: 'active', updatedAt: '2026-04-05 10:30' },
])

const filteredTemplates = computed(() => {
  if (activeType.value === 'all') return templateList.value
  return templateList.value.filter(t => t.type === activeType.value)
})

// ---------- 表单 ----------
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const templateForm = reactive({
  code: '',
  title: '',
  type: '',
  channels: [] as string[],
  content: '',
})

const formRules: FormRules = {
  code: [{ required: true, message: '请输入模板编码', trigger: 'blur' }],
  title: [{ required: true, message: '请输入模板标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }],
}

const variables = ['{userName}', '{orderNo}', '{amount}', '{storeName}', '{activityName}', '{couponName}', '{expireDate}', '{noticeContent}']

// ---------- 预览 ----------
const previewVisible = ref(false)
const previewData = reactive({
  title: '',
  channel: '',
  renderedContent: '',
})

// ---------- 方法 ----------
function getTypeTagType(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    order: 'primary',
    payment: 'success',
    activity: 'warning',
    system: 'info',
  }
  return map[type] || 'info'
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    order: '订单通知',
    payment: '支付通知',
    activity: '活动通知',
    system: '系统通知',
  }
  return map[type] || '未知'
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    sms: '短信',
    push: 'App推送',
    wechat: '微信',
    alipay: '支付宝',
  }
  return map[channel] || channel
}

function showCreateDialog(): void {
  isEdit.value = false
  Object.assign(templateForm, { code: '', title: '', type: '', channels: [], content: '' })
  dialogVisible.value = true
}

function editTemplate(template: TemplateItem): void {
  isEdit.value = true
  Object.assign(templateForm, {
    code: template.code,
    title: template.title,
    type: template.type,
    channels: template.channel.split(','),
    content: template.content,
  })
  dialogVisible.value = true
}

function previewTemplate(template: TemplateItem): void {
  previewData.title = template.title
  previewData.channel = template.channel.split(',')[0]
  // 模拟渲染
  previewData.renderedContent = template.content
    .replace('{userName}', '李明')
    .replace('{orderNo}', 'GY20260406143001')
    .replace('{amount}', '89.00')
    .replace('{storeName}', '朝阳店')
    .replace('{activityName}', '清明小长假')
    .replace('{couponName}', '满100减15')
    .replace('{expireDate}', '2026-05-01')
    .replace('{noticeContent}', '系统将于今晚22:00-次日02:00进行维护，届时服务将暂停。')
  previewVisible.value = true
}

function deleteTemplate(template: TemplateItem): void {
  console.log('删除模板:', template)
}

function insertVariable(variable: string): void {
  templateForm.content += variable
}

async function submitTemplate(): Promise<void> {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      console.log('保存模板:', templateForm)
      dialogVisible.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.tools-template-container {
  max-width: 1440px;
}

.template-types-card {
  margin-bottom: 20px;
}

.template-list-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    span { font-size: 16px; font-weight: 600; color: var(--text-primary); }
  }
}

.content-tip {
  margin-top: 8px;
  p { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
}

.preview-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-content {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  color: var(--text-regular);
  line-height: 1.6;
}

.preview-footer {
  margin-top: 12px;
  text-align: right;
}

.preview-time {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>