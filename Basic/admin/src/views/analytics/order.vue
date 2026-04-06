<template>
  <div class="analytics-order-container">
    <!-- 订单趋势统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--primary">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">今日订单</p>
              <h3 class="stat-card__value">{{ stats.todayOrders }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +12.5% 较昨日
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
              <p class="stat-card__label">本周订单</p>
              <h3 class="stat-card__value">{{ stats.weekOrders }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +8.3% 较上周
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Calendar /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--warning">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">平均客单价</p>
              <h3 class="stat-card__value">¥{{ stats.avgOrderValue }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +5.2% 较上周
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Wallet /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--danger">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">取消率</p>
              <h3 class="stat-card__value">{{ stats.cancelRate }}%</h3>
              <span class="stat-card__trend trend-down">
                <el-icon><Bottom /></el-icon>
                -2.1% 较上周
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><CircleClose /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订单趋势图表 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>订单趋势</span>
              <div class="header-actions">
                <el-radio-group v-model="trendDimension" size="small">
                  <el-radio-button value="daily">按日</el-radio-button>
                  <el-radio-button value="weekly">按周</el-radio-button>
                  <el-radio-button value="monthly">按月</el-radio-button>
                </el-radio-group>
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  size="small"
                  value-format="YYYY-MM-DD"
                  style="margin-left: 10px;"
                />
              </div>
            </div>
          </template>
          <div class="chart-container">
            <div class="trend-chart-mock">
              <div class="trend-bars">
                <div class="trend-bar-item" v-for="(item, index) in orderTrend" :key="index">
                  <div class="bar-wrapper">
                    <div class="bar bar--total" :style="{ height: (item.total / maxOrder * 100) + '%' }"></div>
                    <div class="bar bar--completed" :style="{ height: (item.completed / maxOrder * 100) + '%' }"></div>
                  </div>
                  <span class="bar-date">{{ item.date }}</span>
                </div>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><i class="legend-dot legend-dot--total"></i>总订单</span>
                <span class="legend-item"><i class="legend-dot legend-dot--completed"></i>已完成</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>高峰时段分布</span>
          </template>
          <div class="peak-hours-chart">
            <div class="hour-bar" v-for="(item, index) in peakHours" :key="index">
              <span class="hour-label">{{ item.hour }}</span>
              <div class="hour-value-wrapper">
                <div class="hour-value" :style="{ width: (item.count / maxPeak * 100) + '%' }">
                  <span class="hour-count">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订单状态分布 + 车型排行 -->
    <el-row :gutter="20" class="bottom-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>订单状态分布</span>
          </template>
          <div class="status-distribution">
            <div class="status-item" v-for="item in statusDistribution" :key="item.status">
              <div class="status-info">
                <span class="status-label">{{ item.label }}</span>
                <span class="status-count">{{ item.count }} 单</span>
              </div>
              <el-progress
                :percentage="item.percent"
                :stroke-width="12"
                :color="item.color"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>热门车型TOP10</span>
              <el-button type="primary" link size="small">查看全部</el-button>
            </div>
          </template>
          <el-table :data="topVehicles" stripe size="small">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="model" label="车型" />
            <el-table-column prop="orderCount" label="订单数" width="100" />
            <el-table-column prop="revenue" label="收入" width="120">
              <template #default="{ row }">
                <span class="text-primary">¥{{ row.revenue.toLocaleString() }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Top, Bottom, Document, Calendar, Wallet, CircleClose } from '@element-plus/icons-vue'

// ---------- 统计数据 ----------
const stats = reactive({
  todayOrders: 256,
  weekOrders: 1823,
  avgOrderValue: 156,
  cancelRate: 3.2,
})

const trendDimension = ref('daily')
const dateRange = ref<string[]>([])

// ---------- 订单趋势 ----------
const orderTrend = ref([
  { date: '03-31', total: 180, completed: 156 },
  { date: '04-01', total: 210, completed: 189 },
  { date: '04-02', total: 195, completed: 178 },
  { date: '04-03', total: 245, completed: 220 },
  { date: '04-04', total: 230, completed: 205 },
  { date: '04-05', total: 265, completed: 240 },
  { date: '04-06', total: 256, completed: 232 },
])

const maxOrder = computed(() => Math.max(...orderTrend.value.map(o => o.total)))

// ---------- 高峰时段 ----------
const peakHours = ref([
  { hour: '08:00', count: 45 },
  { hour: '09:00', count: 78 },
  { hour: '10:00', count: 120 },
  { hour: '11:00', count: 156 },
  { hour: '12:00', count: 89 },
  { hour: '14:00', count: 134 },
  { hour: '15:00', count: 145 },
  { hour: '16:00', count: 167 },
  { hour: '17:00', count: 189 },
  { hour: '18:00', count: 210 },
  { hour: '19:00', count: 178 },
  { hour: '20:00', count: 120 },
])

const maxPeak = computed(() => Math.max(...peakHours.value.map(h => h.count)))

// ---------- 订单状态分布 ----------
const statusDistribution = ref([
  { status: 'pending', label: '待支付', count: 45, percent: 8, color: '#faad14' },
  { status: 'confirmed', label: '已确认', count: 89, percent: 15, color: '#1890ff' },
  { status: 'in_progress', label: '进行中', count: 156, percent: 28, color: '#52c41a' },
  { status: 'completed', label: '已完成', count: 2456, percent: 45, color: '#13c2c2' },
  { status: 'cancelled', label: '已取消', count: 78, percent: 4, color: '#ff4d4f' },
])

// ---------- 热门车型 ----------
const topVehicles = ref([
  { model: '小牛NQi Pro', orderCount: 456, revenue: 45600 },
  { model: '雅迪DE3', orderCount: 389, revenue: 38900 },
  { model: '九号C90', orderCount: 345, revenue: 34500 },
  { model: '小牛MQi2', orderCount: 298, revenue: 29800 },
  { model: '台铃狮子王', orderCount: 256, revenue: 25600 },
  { model: '爱玛麦M6', orderCount: 234, revenue: 23400 },
  { model: '绿源Z10', orderCount: 189, revenue: 18900 },
  { model: '新日XC1', orderCount: 167, revenue: 16700 },
  { model: '立马EMMA', orderCount: 145, revenue: 14500 },
  { model: '小刀K19', orderCount: 123, revenue: 12300 },
])
</script>

<style lang="scss" scoped>
.analytics-order-container {
  max-width: 1440px;
}

// ========== 统计卡片 ==========
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: var(--radius-md);
  border: none;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &--primary :deep(.el-card__body) { background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%); }
  &--success :deep(.el-card__body) { background: linear-gradient(135deg, #f0fff0 0%, #eaffea 100%); }
  &--warning :deep(.el-card__body) { background: linear-gradient(135deg, #fffbe6 0%, #fff8e6 100%); }
  &--danger :deep(.el-card__body) { background: linear-gradient(135deg, #fff1f0 0%, #ffebe8 100%); }

  &--primary .stat-card__icon { color: #1890ff; }
  &--success .stat-card__icon { color: #52c41a; }
  &--warning .stat-card__icon { color: #faad14; }
  &--danger .stat-card__icon { color: #ff4d4f; }
}

.stat-card__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__info { flex: 1; }
.stat-card__label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.stat-card__value { font-size: 28px; font-weight: 700; color: var(--text-primary); line-height: 1.2; margin-bottom: 8px; }
.stat-card__trend { font-size: 12px; display: inline-flex; align-items: center; gap: 2px; }
.stat-card__icon { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.7); }
.trend-up { color: var(--success-color); }
.trend-down { color: var(--danger-color); }

// ========== 图表区域 ==========
.chart-row { margin-bottom: 20px; }
.card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; span { font-size: 16px; font-weight: 600; color: var(--text-primary); } }
.header-actions { display: flex; align-items: center; }
.chart-container { height: 280px; }

// ========== 趋势图模拟 ==========
.trend-chart-mock { height: 100%; display: flex; flex-direction: column; }
.trend-bars { flex: 1; display: flex; align-items: flex-end; justify-content: space-around; padding: 20px 10px; gap: 8px; }
.trend-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bar-wrapper { width: 100%; height: 180px; display: flex; align-items: flex-end; gap: 4px; }
.bar { flex: 1; border-radius: 4px 4px 0 0; transition: height 0.5s ease; &--total { background: linear-gradient(180deg, #69c0ff, #1890ff); } &--completed { background: linear-gradient(180deg, #95de64, #52c41a); } }
.bar-date { font-size: 11px; color: var(--text-placeholder); margin-top: 8px; }
.chart-legend { display: flex; justify-content: center; gap: 20px; padding-top: 10px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; &--total { background: #1890ff; } &--completed { background: #52c41a; } }

// ========== 高峰时段 ==========
.peak-hours-chart { padding: 10px 0; }
.hour-bar { display: flex; align-items: center; margin-bottom: 8px; }
.hour-label { width: 50px; font-size: 12px; color: var(--text-secondary); }
.hour-value-wrapper { flex: 1; height: 20px; background: #f5f5f5; border-radius: 4px; overflow: hidden; }
.hour-value { height: 100%; background: linear-gradient(90deg, #1890ff, #69c0ff); border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; min-width: 40px; }
.hour-count { font-size: 11px; color: #fff; font-weight: 500; }

// ========== 状态分布 ==========
.status-distribution { padding: 10px 0; }
.status-item { margin-bottom: 16px; }
.status-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.status-label { font-size: 13px; color: var(--text-primary); }
.status-count { font-size: 13px; color: var(--text-secondary); }

.bottom-row { margin-top: 20px; }
.text-primary { color: var(--primary-color); }
</style>