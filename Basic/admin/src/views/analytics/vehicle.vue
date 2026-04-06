<template>
  <div class="analytics-vehicle-container">
    <!-- 车辆概览统计 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--primary">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">总车辆数</p>
              <h3 class="stat-card__value">{{ stats.totalVehicles }}</h3>
              <span class="stat-card__sub">辆</span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Van /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--success">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">平均利用率</p>
              <h3 class="stat-card__value">{{ stats.avgUtilization }}%</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +3.2%
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><TrendCharts /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--warning">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">平均周转率</p>
              <h3 class="stat-card__value">{{ stats.avgTurnover }}</h3>
              <span class="stat-card__sub">次/周</span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Refresh /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--danger">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">维护中</p>
              <h3 class="stat-card__value">{{ stats.inMaintenance }}</h3>
              <span class="stat-card__sub">辆</span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Tools /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 利用率趋势 + 车型排行 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>车辆利用率趋势</span>
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
          <div class="utilization-chart">
            <div class="utilization-bars">
              <div class="util-bar-item" v-for="(item, index) in utilizationTrend" :key="index">
                <div class="util-bar" :style="{ height: item.rate + '%' }">
                  <span class="util-value">{{ item.rate }}%</span>
                </div>
                <span class="util-date">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>车型收入排行</span>
              <el-radio-group v-model="rankType" size="small">
                <el-radio-button value="revenue">收入</el-radio-button>
                <el-radio-button value="orders">订单数</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="ranking-list">
            <div class="ranking-item" v-for="(item, index) in vehicleRanking" :key="item.model">
              <span class="ranking-index" :class="{ 'top-3': index < 3 }">{{ index + 1 }}</span>
              <div class="ranking-info">
                <span class="ranking-model">{{ item.model }}</span>
                <el-progress
                  :percentage="(item.value / maxRankValue) * 100"
                  :stroke-width="10"
                  :color="getRankColor(index)"
                  :show-text="false"
                />
              </div>
              <span class="ranking-value">
                {{ rankType === 'revenue' ? '¥' + item.value.toLocaleString() : item.value + ' 单' }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 车辆状态分布 + 门店对比 -->
    <el-row :gutter="20" class="bottom-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>车辆状态分布</span>
          </template>
          <div class="status-grid">
            <div class="status-card" v-for="item in vehicleStatus" :key="item.status">
              <div class="status-card__icon" :style="{ background: item.color }">
                <el-icon :size="24"><component :is="item.icon" /></el-icon>
              </div>
              <div class="status-card__info">
                <span class="status-card__count">{{ item.count }}</span>
                <span class="status-card__label">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>门店利用率对比</span>
              <el-select v-model="selectedStore" placeholder="选择门店" size="small" clearable style="width: 150px;">
                <el-option v-for="store in storeList" :key="store.id" :label="store.name" :value="store.id" />
              </el-select>
            </div>
          </template>
          <el-table :data="storeComparison" stripe size="small">
            <el-table-column prop="name" label="门店名称" />
            <el-table-column prop="vehicles" label="车辆数" width="80" />
            <el-table-column prop="utilization" label="利用率" width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.utilization"
                  :stroke-width="10"
                  :color="getUtilColor(row.utilization)"
                  :show-text="true"
                />
              </template>
            </el-table-column>
            <el-table-column prop="revenue" label="本周收入" width="120">
              <template #default="{ row }">
                <span class="text-primary font-bold">¥{{ row.revenue.toLocaleString() }}</span>
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
import { Top, Van, TrendCharts, Refresh, Tools, CircleCheck, Clock, WarningFilled, CircleClose } from '@element-plus/icons-vue'

// ---------- 统计数据 ----------
const stats = reactive({
  totalVehicles: 486,
  avgUtilization: 72.5,
  avgTurnover: 4.2,
  inMaintenance: 23,
})

const dateRange = ref<string[]>([])
const rankType = ref('revenue')
const selectedStore = ref('')

// ---------- 利用率趋势 ----------
const utilizationTrend = ref([
  { date: '03-31', rate: 68 },
  { date: '04-01', rate: 72 },
  { date: '04-02', rate: 70 },
  { date: '04-03', rate: 75 },
  { date: '04-04', rate: 78 },
  { date: '04-05', rate: 73 },
  { date: '04-06', rate: 72 },
])

// ---------- 车型排行 ----------
const vehicleRanking = ref([
  { model: '小牛NQi Pro', value: 45600 },
  { model: '雅迪DE3', value: 38900 },
  { model: '九号C90', value: 34500 },
  { model: '小牛MQi2', value: 29800 },
  { model: '台铃狮子王', value: 25600 },
  { model: '爱玛麦M6', value: 23400 },
  { model: '绿源Z10', value: 18900 },
  { model: '新日XC1', value: 16700 },
])

const maxRankValue = computed(() => Math.max(...vehicleRanking.value.map(v => v.value)))

// ---------- 车辆状态 ----------
const vehicleStatus = ref([
  { status: 'available', label: '可用', count: 312, color: '#52c41a', icon: CircleCheck },
  { status: 'rented', label: '出租中', count: 145, color: '#1890ff', icon: Clock },
  { status: 'maintenance', label: '维护中', count: 23, color: '#faad14', icon: WarningFilled },
  { status: 'offline', label: '已下架', count: 6, color: '#ff4d4f', icon: CircleClose },
])

// ---------- 门店对比 ----------
const storeList = ref([
  { id: 'S001', name: '朝阳店' },
  { id: 'S002', name: '海淀店' },
  { id: 'S003', name: '西城店' },
  { id: 'S004', name: '东城店' },
])

const storeComparison = ref([
  { id: 'S001', name: '朝阳店', vehicles: 156, utilization: 78, revenue: 45600 },
  { id: 'S002', name: '海淀店', vehicles: 128, utilization: 72, revenue: 38900 },
  { id: 'S003', name: '西城店', vehicles: 112, utilization: 65, revenue: 32100 },
  { id: 'S004', name: '东城店', vehicles: 90, utilization: 70, revenue: 28400 },
])

// ---------- 方法 ----------
function getRankColor(index: number): string {
  const colors = ['#faad14', '#a0a0a0', '#cd7f32', '#1890ff', '#1890ff', '#1890ff', '#1890ff', '#1890ff']
  return colors[index] || '#1890ff'
}

function getUtilColor(util: number): string {
  if (util >= 80) return '#52c41a'
  if (util >= 60) return '#1890ff'
  if (util >= 40) return '#faad14'
  return '#ff4d4f'
}
</script>

<style lang="scss" scoped>
.analytics-vehicle-container {
  max-width: 1440px;
}

// ========== 统计卡片 ==========
.stat-cards { margin-bottom: 20px; }
.stat-card {
  border-radius: var(--radius-md);
  border: none;
  transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); }
  &--primary :deep(.el-card__body) { background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%); }
  &--success :deep(.el-card__body) { background: linear-gradient(135deg, #f0fff0 0%, #eaffea 100%); }
  &--warning :deep(.el-card__body) { background: linear-gradient(135deg, #fffbe6 0%, #fff8e6 100%); }
  &--danger :deep(.el-card__body) { background: linear-gradient(135deg, #fff1f0 0%, #ffebe8 100%); }
  &--primary .stat-card__icon { color: #1890ff; }
  &--success .stat-card__icon { color: #52c41a; }
  &--warning .stat-card__icon { color: #faad14; }
  &--danger .stat-card__icon { color: #ff4d4f; }
}
.stat-card__content { display: flex; align-items: center; justify-content: space-between; }
.stat-card__info { flex: 1; }
.stat-card__label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.stat-card__value { font-size: 28px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.stat-card__sub { font-size: 14px; color: var(--text-secondary); margin-left: 4px; }
.stat-card__trend { font-size: 12px; display: inline-flex; align-items: center; gap: 2px; }
.stat-card__icon { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.7); }
.trend-up { color: var(--success-color); }

// ========== 图表区域 ==========
.chart-row { margin-bottom: 20px; }
.card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; span { font-size: 16px; font-weight: 600; color: var(--text-primary); } }

// ========== 利用率图表 ==========
.utilization-chart { height: 280px; }
.utilization-bars { height: 100%; display: flex; align-items: flex-end; justify-content: space-around; padding: 20px 10px; gap: 12px; }
.util-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.util-bar { width: 100%; background: linear-gradient(180deg, #69c0ff, #1890ff); border-radius: 4px 4px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; transition: height 0.5s ease; min-height: 30px; }
.util-value { font-size: 11px; color: #fff; font-weight: 500; }
.util-date { font-size: 11px; color: var(--text-placeholder); margin-top: 8px; }

// ========== 排行榜 ==========
.ranking-list { padding: 10px 0; }
.ranking-item { display: flex; align-items: center; margin-bottom: 16px; gap: 12px; }
.ranking-index { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; font-weight: 600; background: #f5f5f5; color: var(--text-secondary); &.top-3 { background: linear-gradient(135deg, #faad14, #ffd666); color: #fff; } }
.ranking-info { flex: 1; }
.ranking-model { font-size: 14px; color: var(--text-primary); margin-bottom: 6px; display: block; }
.ranking-value { font-size: 14px; font-weight: 600; color: var(--primary-color); min-width: 80px; text-align: right; }

// ========== 车辆状态网格 ==========
.status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 10px 0; }
.status-card { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 8px; background: #fafafa; }
.status-card__icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #fff; }
.status-card__count { font-size: 24px; font-weight: 700; color: var(--text-primary); display: block; }
.status-card__label { font-size: 13px; color: var(--text-secondary); }

.bottom-row { margin-top: 20px; }
.text-primary { color: var(--primary-color); }
.font-bold { font-weight: 600; }
</style>