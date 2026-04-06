<template>
  <div class="exception-list-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="6">
        <el-card shadow="hover" class="stat-card stat-card--danger">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">待处理</p>
              <h3 class="stat-card__value">{{ stats.pending }}</h3>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="36"><WarningFilled /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="6">
        <el-card shadow="hover" class="stat-card stat-card--warning">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">处理中</p>
              <h3 class="stat-card__value">{{ stats.processing }}</h3>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="36"><Clock /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="6">
        <el-card shadow="hover" class="stat-card stat-card--success">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">已处理</p>
              <h3 class="stat-card__value">{{ stats.resolved }}</h3>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="36"><CircleCheck /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="6">
        <el-card shadow="hover" class="stat-card stat-card--info">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">本月总计</p>
              <h3 class="stat-card__value">{{ stats.total }}</h3>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="36"><DataAnalysis /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="异常类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 140px;">
            <el-option label="超时未取" value="timeout_pickup" />
            <el-option label="长期未还" value="long_rental" />
            <el-option label="支付失败" value="payment_failed" />
            <el-option label="车辆故障" value="vehicle_fault" />
            <el-option label="用户投诉" value="complaint" />
            <el-option label="违章处理" value="violation" />
            <el-option label="押金纠纷" value="deposit_dispute" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px;">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已处理" value="resolved" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filterForm.priority" placeholder="全部优先级" clearable style="width: 120px;">
            <el-option label="紧急" value="urgent" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">搜索</el-button>
          <el-button :icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 异常列表 -->
    <el-card shadow="hover" class="exception-table-card">
      <el-table :data="exceptionList" stripe style="width: 100%">
        <el-table-column prop="id" label="异常ID" width="100" />
        <el-table-column prop="orderNo" label="订单编号" width="160" />
        <el-table-column prop="type" label="异常类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="异常描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small" effect="dark">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column prop="handlerName" label="处理人" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="handleException(row)"
            >
              处理
            </el-button>
            <el-button
              v-if="row.status === 'processing'"
              type="warning"
              link
              size="small"
              @click="completeException(row)"
            >
              完成
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRecords"
        />
      </div>
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog v-model="handleDialogVisible" title="处理异常" width="600px">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处理方式">
          <el-select v-model="handleForm.action" placeholder="选择处理方式" style="width: 100%;">
            <el-option label="联系用户" value="contact_user" />
            <el-option label="发送提醒" value="send_reminder" />
            <el-option label="取消订单" value="cancel_order" />
            <el-option label="更换车辆" value="change_vehicle" />
            <el-option label="退款处理" value="refund" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="handleForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入处理备注"
          />
        </el-form-item>
        <el-form-item label="处理结果">
          <el-radio-group v-model="handleForm.result">
            <el-radio value="resolved">已解决</el-radio>
            <el-radio value="follow_up">需跟进</el-radio>
            <el-radio value="escalate">需升级</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { WarningFilled, Clock, CircleCheck, DataAnalysis, Search, Refresh } from '@element-plus/icons-vue'

// ---------- 统计数据 ----------
const stats = reactive({
  pending: 12,
  processing: 5,
  resolved: 156,
  total: 173,
})

// ---------- 筛选条件 ----------
const filterForm = reactive({
  type: '',
  status: '',
  priority: '',
  dateRange: [] as string[],
})

// ---------- 异常列表 ----------
interface ExceptionItem {
  id: string
  orderNo: string
  type: string
  description: string
  priority: string
  status: string
  createdAt: string
  handlerName: string
}

const exceptionList = ref<ExceptionItem[]>([
  { id: 'E001', orderNo: 'GY20260406143001', type: 'timeout_pickup', description: '用户下单超过30分钟未取车', priority: 'high', status: 'pending', createdAt: '2026-04-06 15:00', handlerName: '-' },
  { id: 'E002', orderNo: 'GY20260405122503', type: 'long_rental', description: '超过预计还车时间24小时未还车', priority: 'urgent', status: 'pending', createdAt: '2026-04-06 14:30', handlerName: '-' },
  { id: 'E003', orderNo: 'GY20260406111008', type: 'payment_failed', description: '支付回调失败，订单状态不一致', priority: 'medium', status: 'processing', createdAt: '2026-04-06 11:30', handlerName: '张三' },
  { id: 'E004', orderNo: 'GY20260405164502', type: 'vehicle_fault', description: '用户反馈车辆电池续航不足', priority: 'low', status: 'resolved', createdAt: '2026-04-05 17:00', handlerName: '李四' },
  { id: 'E005', orderNo: 'GY20260405103015', type: 'complaint', description: '用户投诉车辆清洁度问题', priority: 'medium', status: 'processing', createdAt: '2026-04-05 11:00', handlerName: '王五' },
])

const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(173)

// ---------- 处理弹窗 ----------
const handleDialogVisible = ref(false)
const handleForm = reactive({
  action: '',
  remark: '',
  result: 'resolved',
})

// ---------- 方法 ----------
function getTypeTagType(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    timeout_pickup: 'warning',
    long_rental: 'danger',
    payment_failed: 'danger',
    vehicle_fault: 'warning',
    complaint: 'primary',
    violation: 'info',
    deposit_dispute: 'danger',
  }
  return map[type] || 'info'
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    timeout_pickup: '超时未取',
    long_rental: '长期未还',
    payment_failed: '支付失败',
    vehicle_fault: '车辆故障',
    complaint: '用户投诉',
    violation: '违章处理',
    deposit_dispute: '押金纠纷',
  }
  return map[type] || '未知'
}

function getPriorityTagType(priority: string): 'danger' | 'warning' | 'primary' | 'info' {
  const map: Record<string, 'danger' | 'warning' | 'primary' | 'info'> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info',
  }
  return map[priority] || 'info'
}

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[priority] || '未知'
}

function getStatusTagType(status: string): 'success' | 'warning' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'info'> = {
    pending: 'warning',
    processing: 'info',
    resolved: 'success',
  }
  return map[status] || 'info'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已处理',
  }
  return map[status] || '未知'
}

function viewDetail(exception: ExceptionItem): void {
  console.log('查看详情:', exception)
}

function handleException(exception: ExceptionItem): void {
  console.log('处理异常:', exception)
  handleDialogVisible.value = true
}

function completeException(exception: ExceptionItem): void {
  console.log('完成处理:', exception)
  exception.status = 'resolved'
}

function submitHandle(): void {
  console.log('提交处理:', handleForm)
  handleDialogVisible.value = false
}
</script>

<style lang="scss" scoped>
.exception-list-container {
  max-width: 1440px;
}

// ========== 统计卡片 ==========
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: var(--radius-md);
  border: none;

  &--danger :deep(.el-card__body) { background: linear-gradient(135deg, #fff1f0 0%, #ffebe8 100%); }
  &--warning :deep(.el-card__body) { background: linear-gradient(135deg, #fffbe6 0%, #fff8e6 100%); }
  &--success :deep(.el-card__body) { background: linear-gradient(135deg, #f0fff0 0%, #eaffea 100%); }
  &--info :deep(.el-card__body) { background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%); }

  &--danger .stat-card__icon { color: #ff4d4f; }
  &--warning .stat-card__icon { color: #faad14; }
  &--success .stat-card__icon { color: #52c41a; }
  &--info .stat-card__icon { color: #1890ff; }
}

.stat-card__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__info { flex: 1; }
.stat-card__label { font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
.stat-card__value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.stat-card__icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }

// ========== 筛选条件 ==========
.filter-card {
  margin-bottom: 20px;
}

// ========== 异常表格 ==========
.exception-table-card {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>