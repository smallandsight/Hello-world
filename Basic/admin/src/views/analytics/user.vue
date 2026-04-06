<template>
  <div class="analytics-user-container">
    <!-- 用户分群统计卡片 -->
    <el-row :gutter="20" class="segment-cards">
      <el-col :xs="24" :sm="12" :lg="6" v-for="segment in segmentStats" :key="segment.type">
        <el-card shadow="hover" class="segment-card" :class="`segment-card--${segment.type}`">
          <div class="segment-card__content">
            <div class="segment-card__icon">
              <el-icon :size="36"><component :is="segment.icon" /></el-icon>
            </div>
            <div class="segment-card__info">
              <p class="segment-card__label">{{ segment.label }}</p>
              <h3 class="segment-card__value">{{ segment.count }}</h3>
              <span class="segment-card__percent">占比 {{ segment.percent }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- RFM 分布图 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>RFM 分布分析</span>
              <el-radio-group v-model="rfmDimension" size="small">
                <el-radio-button value="recency">R 最近消费</el-radio-button>
                <el-radio-button value="frequency">F 消费频次</el-radio-button>
                <el-radio-button value="monetary">M 消费金额</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-placeholder" ref="rfmChartRef">
            <div class="chart-mock">
              <div class="bar-item" v-for="(item, index) in rfmData" :key="index">
                <div class="bar-label">{{ item.label }}</div>
                <div class="bar-value" :style="{ width: item.percent + '%' }"></div>
                <div class="bar-count">{{ item.count }} 人</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>用户活跃度趋势</span>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="small"
                value-format="YYYY-MM-DD"
              />
            </div>
          </template>
          <div class="chart-placeholder">
            <div class="line-chart-mock">
              <div class="line-point" v-for="(item, index) in activityTrend" :key="index" :style="{ left: (index / (activityTrend.length - 1) * 100) + '%' }">
                <span class="point-dot"></span>
                <span class="point-value">{{ item.value }}</span>
              </div>
              <svg class="line-svg" viewBox="0 0 100 40">
                <polyline fill="none" stroke="#1890ff" stroke-width="2" points="0,30 15,25 30,28 45,15 60,20 75,12 90,18 100,10" />
              </svg>
            </div>
            <div class="line-legend">
              <span v-for="(item, index) in activityTrend" :key="index">{{ item.date }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户列表 -->
    <el-card shadow="hover" class="user-table-card">
      <template #header>
        <div class="card-header">
          <span>用户分群明细</span>
          <div class="header-actions">
            <el-select v-model="filterSegment" placeholder="选择用户分群" size="small" clearable style="width: 150px; margin-right: 10px;">
              <el-option label="高价值用户" value="high_value" />
              <el-option label="活跃用户" value="active" />
              <el-option label="潜力用户" value="potential" />
              <el-option label="沉睡用户" value="dormant" />
              <el-option label="流失用户" value="churned" />
            </el-select>
            <el-button type="primary" size="small" :icon="Download">导出报表</el-button>
          </div>
        </div>
      </template>
      <el-table :data="userList" stripe style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="nickname" label="昵称" width="140" />
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">
            <span class="text-muted">{{ maskPhone(row.phone) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="segment" label="用户分群" width="120">
          <template #default="{ row }">
            <el-tag :type="getSegmentType(row.segment)" size="small">
              {{ getSegmentLabel(row.segment) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="RFM评分" width="200">
          <template #default="{ row }">
            <div class="rfm-scores">
              <span class="rfm-score">R: {{ row.recency }}</span>
              <span class="rfm-score">F: {{ row.frequency }}</span>
              <span class="rfm-score">M: {{ row.monetary }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalSpent" label="累计消费" width="120">
          <template #default="{ row }">
            <span class="text-primary font-bold">¥{{ row.totalSpent.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="100" />
        <el-table-column prop="lastOrderTime" label="最近下单" min-width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewUserDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalUsers"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Download, Star, User, Timer, WarningFilled, Close } from '@element-plus/icons-vue'

// ---------- 用户分群统计 ----------
const segmentStats = reactive([
  { type: 'high_value', label: '高价值用户', count: 1256, percent: 15.2, icon: Star },
  { type: 'active', label: '活跃用户', count: 2834, percent: 34.3, icon: User },
  { type: 'potential', label: '潜力用户', count: 1892, percent: 22.9, icon: Timer },
  { type: 'dormant', label: '沉睡用户', count: 1456, percent: 17.6, icon: WarningFilled },
])

const rfmDimension = ref('recency')
const dateRange = ref<string[]>([])
const filterSegment = ref('')

// ---------- RFM 分布数据 ----------
const rfmData = ref([
  { label: '≤7天', count: 2845, percent: 85 },
  { label: '8-30天', count: 1923, percent: 60 },
  { label: '31-60天', count: 1256, percent: 40 },
  { label: '61-90天', count: 876, percent: 25 },
  { label: '>90天', count: 1345, percent: 15 },
])

// ---------- 活跃度趋势 ----------
const activityTrend = ref([
  { date: '03-01', value: 1256 },
  { date: '03-08', value: 1423 },
  { date: '03-15', value: 1389 },
  { date: '03-22', value: 1567 },
  { date: '03-29', value: 1678 },
  { date: '04-05', value: 1723 },
  { date: '04-06', value: 1856 },
])

// ---------- 用户列表 ----------
interface UserItem {
  userId: string
  nickname: string
  phone: string
  segment: string
  recency: number
  frequency: number
  monetary: number
  totalSpent: number
  orderCount: number
  lastOrderTime: string
}

const userList = ref<UserItem[]>([
  { userId: 'U10001', nickname: '李明', phone: '138****5678', segment: 'high_value', recency: 5, frequency: 4, monetary: 5, totalSpent: 25680, orderCount: 28, lastOrderTime: '2026-04-05 14:30' },
  { userId: 'U10002', nickname: '王芳', phone: '139****1234', segment: 'active', recency: 4, frequency: 3, monetary: 4, totalSpent: 12340, orderCount: 15, lastOrderTime: '2026-04-04 10:20' },
  { userId: 'U10003', nickname: '赵强', phone: '137****8765', segment: 'potential', recency: 3, frequency: 2, monetary: 3, totalSpent: 5680, orderCount: 8, lastOrderTime: '2026-03-28 16:45' },
  { userId: 'U10004', nickname: '孙静', phone: '136****4321', segment: 'dormant', recency: 2, frequency: 1, monetary: 2, totalSpent: 2340, orderCount: 3, lastOrderTime: '2026-02-15 09:10' },
  { userId: 'U10005', nickname: '周伟', phone: '135****9876', segment: 'active', recency: 4, frequency: 3, monetary: 4, totalSpent: 18920, orderCount: 22, lastOrderTime: '2026-04-03 11:30' },
])

const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(8259)

// ---------- 方法 ----------
function maskPhone(phone: string): string {
  return phone || '未绑定'
}

function getSegmentType(segment: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    high_value: 'success',
    active: 'primary',
    potential: 'warning',
    dormant: 'info',
    churned: 'danger',
  }
  return map[segment] || 'info'
}

function getSegmentLabel(segment: string): string {
  const map: Record<string, string> = {
    high_value: '高价值',
    active: '活跃',
    potential: '潜力',
    dormant: '沉睡',
    churned: '流失',
  }
  return map[segment] || '未知'
}

function viewUserDetail(user: UserItem): void {
  console.log('查看用户详情:', user)
}
</script>

<style lang="scss" scoped>
.analytics-user-container {
  max-width: 1440px;
}

// ========== 分群卡片 ==========
.segment-cards {
  margin-bottom: 20px;
}

.segment-card {
  border-radius: var(--radius-md);
  border: none;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &--high_value :deep(.el-card__body) { background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%); }
  &--active :deep(.el-card__body) { background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%); }
  &--potential :deep(.el-card__body) { background: linear-gradient(135deg, #f6ffed 0%, #eaffea 100%); }
  &--dormant :deep(.el-card__body) { background: linear-gradient(135deg, #fff1f0 0%, #ffebe8 100%); }

  &--high_value .segment-card__icon { color: #faad14; }
  &--active .segment-card__icon { color: #1890ff; }
  &--potential .segment-card__icon { color: #52c41a; }
  &--dormant .segment-card__icon { color: #ff4d4f; }
}

.segment-card__content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.segment-card__icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.segment-card__info {
  flex: 1;
}

.segment-card__label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.segment-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 4px;
}

.segment-card__percent {
  font-size: 12px;
  color: var(--text-placeholder);
}

// ========== 图表区域 ==========
.chart-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;

  span {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.chart-placeholder {
  height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chart-mock {
  padding: 20px;
}

.bar-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.bar-label {
  width: 60px;
  font-size: 13px;
  color: var(--text-secondary);
}

.bar-value {
  height: 20px;
  background: linear-gradient(90deg, #1890ff, #69c0ff);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-count {
  font-size: 13px;
  color: var(--text-regular);
}

// ========== 折线图模拟 ==========
.line-chart-mock {
  position: relative;
  height: 150px;
  margin-top: 20px;
}

.line-point {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;

  .point-dot {
    width: 8px;
    height: 8px;
    background: #1890ff;
    border-radius: 50%;
    margin-bottom: 4px;
  }

  .point-value {
    font-size: 12px;
    color: var(--text-regular);
  }
}

.line-svg {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 100px;
}

.line-legend {
  display: flex;
  justify-content: space-between;
  padding: 20px 0 0;
  font-size: 12px;
  color: var(--text-placeholder);
}

// ========== 用户列表 ==========
.user-table-card {
  margin-top: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.rfm-scores {
  display: flex;
  gap: 8px;
}

.rfm-score {
  font-size: 12px;
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 4px;
  color: var(--text-secondary);
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.text-primary { color: var(--primary-color); }
.text-muted { color: var(--text-placeholder); }
.font-bold { font-weight: 600; }
</style>