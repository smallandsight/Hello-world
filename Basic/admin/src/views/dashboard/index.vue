<template>
  <div class="dashboard-container">
    <!-- 统计卡片区域 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--primary">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">今日新订单</p>
              <h3 class="stat-card__value">{{ stats.todayOrders }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                12.5% 较昨日
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Document /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--success">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">今日收入</p>
              <h3 class="stat-card__value">¥{{ stats.todayRevenue.toLocaleString() }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                8.3% 较昨日
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Wallet /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--warning">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">在租车辆</p>
              <h3 class="stat-card__value">{{ stats.activeVehicles }}</h3>
              <span class="stat-card__trend trend-down">
                <el-icon><Bottom /></el-icon>
                2.1% 较昨日
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Van /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--danger">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">待处理工单</p>
              <h3 class="stat-card__value">{{ stats.pendingWorkorders }}</h3>
              <span class="stat-card__trend text-danger">
                需要关注
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><BellFilled /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作区域 -->
    <el-row :gutter="20" class="quick-actions-row">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-grid">
            <div class="quick-item" @click="$router.push('/order/list')">
              <div class="quick-item__icon quick-item__icon--blue">
                <el-icon :size="24"><Plus /></el-icon>
              </div>
              <span class="quick-item__text">新建订单</span>
            </div>
            <div class="quick-item" @click="$router.push('/vehicle/list')">
              <div class="quick-item__icon quick-item__icon--green">
                <el-icon :size="24"><CirclePlus /></el-icon>
              </div>
              <span class="quick-item__text">添加车辆</span>
            </div>
            <div class="quick-item" @click="$router.push('/staff/list')">
              <div class="quick-item__icon quick-item__icon--orange">
                <el-icon :size="24"><UserFilled /></el-icon>
              </div>
              <span class="quick-item__text">员工入职</span>
            </div>
            <div class="quick-item" @click="$router.push('/finance/revenue')">
              <div class="quick-item__icon quick-item__icon--purple">
                <el-icon :size="24"><DataAnalysis /></el-icon>
              </div>
              <span class="quick-item__text">收入报表</span>
            </div>
            <div class="quick-item" @click="$router.push('/finance/reconciliation')">
              <div class="quick-item__icon quick-item__icon--cyan">
                <el-icon :size="24"><DocumentChecked /></el-icon>
              </div>
              <span class="quick-item__text">财务对账</span>
            </div>
            <div class="quick-item" @click="$router.push('/store/list')">
              <div class="quick-item__icon quick-item__icon--pink">
                <el-icon :size="24"><OfficeBuilding /></el-icon>
              </div>
              <span class="quick-item__text">门店管理</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
              <el-button type="primary" link size="small">查看全部</el-button>
            </div>
          </template>
          <div class="todo-list">
            <div v-for="(todo, index) in todoList" :key="index" class="todo-item">
              <el-tag
                :type="getTodoTagType(todo.priority)"
                size="small"
                effect="dark"
                round
                class="todo-tag"
              >
                {{ getTodoPriorityLabel(todo.priority) }}
              </el-tag>
              <div class="todo-content">
                <p class="todo-title">{{ todo.title }}</p>
                <span class="todo-time">{{ todo.time }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近订单 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近订单</span>
              <el-button type="primary" link size="small" @click="$router.push('/order/list')">
                查看全部订单 →
              </el-button>
            </div>
          </template>
          <el-table :data="recentOrders" stripe style="width: 100%">
            <el-table-column prop="orderNo" label="订单编号" width="200" />
            <el-table-column prop="customerName" label="客户姓名" width="120" />
            <el-table-column prop="vehicleModel" label="车辆型号" width="160" />
            <el-table-column prop="amount" label="金额(元)" width="120">
              <template #default="{ row }">
                <span class="text-primary font-bold">¥{{ row.amount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" min-width="170" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// ---------- 统计数据 (模拟，后续对接API) ----------
const stats = reactive({
  todayOrders: 128,
  todayRevenue: 15680,
  activeVehicles: 56,
  pendingWorkorders: 7,
})

// ---------- 待办事项 ----------
interface TodoItem {
  title: string
  time: string
  priority: 'high' | 'medium' | 'low'
}

const todoList = ref<TodoItem[]>([
  { title: '审核新门店「朝阳店」的入驻申请', time: '10 分钟前', priority: 'high' },
  { title: '3辆电动车需要安排年检', time: '1 小时前', priority: 'medium' },
  { title: '客户张先生投诉处理中', time: '2 小时前', priority: 'high' },
  { title: '本周营收报表尚未确认', time: '3 小时前', priority: 'low' },
])

function getTodoTagType(priority: TodoItem['priority']): '' | 'danger' | 'warning' {
  const map: Record<TodoItem['priority'], '' | 'danger' | 'warning'> = {
    high: 'danger',
    medium: 'warning',
    low: '',
  }
  return map[priority]
}

function getTodoPriorityLabel(priority: TodoItem['priority']): string {
  const map: Record<TodoItem['priority'], string> = {
    high: '紧急',
    medium: '一般',
    low: '普通',
  }
  return map[priority]
}

// ---------- 最近订单 ----------
interface OrderItem {
  orderNo: string
  customerName: string
  vehicleModel: string
  amount: number
  status: string
  createTime: string
}

const recentOrders = ref<OrderItem[]>([
  { orderNo: 'GY20260406143001', customerName: '李明', vehicleModel: '小牛NQi Pro', amount: 89, status: '进行中', createTime: '2026-04-06 14:30:00' },
  { orderNo: 'GY20260406122503', customerName: '王芳', vehicleModel: '雅迪DE3', amount: 65, status: '已完成', createTime: '2026-04-06 12:25:00' },
  { orderNo: 'GY20260406111008', customerName: '赵强', vehicleModel: '九号C90', amount: 128, status: '进行中', createTime: '2026-04-06 11:10:00' },
  { orderNo: 'GY20260405164502', customerName: '孙静', vehicleModel: '小牛MQi2', amount: 75, status: '已取消', createTime: '2026-04-05 16:45:00' },
  { orderNo: 'GY20260405103015', customerName: '周伟', vehicleModel: '台铃狮子王', amount: 96, status: '已完成', createTime: '2026-04-05 10:30:00' },
])

function getStatusType(status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    '已完成': 'success',
    '进行中': 'primary',
    '已取消': 'info',
    '待支付': 'warning',
    '已退款': 'danger',
  }
  return map[status] || 'info'
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  max-width: 1440px;
}

// ========== 统计卡片 ==========
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: var(--radius-md);
  transition: all 0.35s ease;
  border: none;

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
  }

  // 各颜色主题
  &--primary :deep(.el-card__body) {
    background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%);
  }
  &--success :deep(.el-card__body) {
    background: linear-gradient(135deg, #f0fff0 0%, #eaffea 100%);
  }
  &--warning :deep(.el-card__body) {
    background: linear-gradient(135deg, #fffbe6 0%, #fff8e6 100%);
  }
  &--danger :deep(.el-card__body) {
    background: linear-gradient(135deg, #fff1f0 0%, #ffebe8 100%);
  }

  &--primary .stat-card__icon { color: var(--primary-color); }
  &--success .stat-card__icon { color: var(--success-color); }
  &--warning .stat-card__icon { color: var(--warning-color); }
  &--danger .stat-card__icon { color: var(--danger-color); }
}

.stat-card__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__info {
  flex: 1;
}

.stat-card__label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 8px;
}

.stat-card__trend {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &.trend-up { color: var(--success-color); }
  &.trend-down { color: var(--danger-color); }
}

.stat-card__icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.7);
}

// ========== 快捷操作 ==========
.quick-actions-row {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    span {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .quick-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
  }
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 8px;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.25s ease;

  &:hover {
    background: rgba(24, 144, 255, 0.04);

    .quick-item__icon {
      transform: scale(1.08);
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    color: #fff;
    transition: transform 0.25s ease;

    &--blue   { background: linear-gradient(135deg, #1890ff, #096dd9); }
    &--green  { background: linear-gradient(135deg, #52c41a, #389e0d); }
    &--orange { background: linear-gradient(135deg, #faad14, #d48806); }
    &--purple { background: linear-gradient(135deg, #722ed1, #531dab); }
    &--cyan   { background: linear-gradient(135deg, #13c2c2, #08979c); }
    &--pink   { background: linear-gradient(135deg, #eb2f96, #c41d7f); }
  }

  &__text {
    font-size: 13px;
    color: var(--text-regular);
  }
}

// ========== 待办事项 ==========
.todo-list {
  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color-light);

    &:last-child {
      border-bottom: none;
    }
  }

  .todo-tag {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .todo-content {
    flex: 1;
    min-width: 0;
  }

  .todo-title {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .todo-time {
    font-size: 12px;
    color: var(--text-placeholder);
  }
}
</style>
