<template>
  <div class="analytics-revenue-container">
    <!-- 收入概览 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--primary">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">今日收入</p>
              <h3 class="stat-card__value">¥{{ stats.todayRevenue.toLocaleString() }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +15.2% 较昨日
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Wallet /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--success">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">本周收入</p>
              <h3 class="stat-card__value">¥{{ stats.weekRevenue.toLocaleString() }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +8.5% 较上周
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
              <p class="stat-card__label">本月收入</p>
              <h3 class="stat-card__value">¥{{ stats.monthRevenue.toLocaleString() }}</h3>
              <span class="stat-card__trend trend-up">
                <el-icon><Top /></el-icon>
                +12.3%
              </span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><DataAnalysis /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card stat-card--info">
          <div class="stat-card__content">
            <div class="stat-card__info">
              <p class="stat-card__label">累计收入</p>
              <h3 class="stat-card__value">¥{{ stats.totalRevenue.toLocaleString() }}</h3>
              <span class="stat-card__sub">年度累计</span>
            </div>
            <div class="stat-card__icon">
              <el-icon :size="40"><Money /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收入趋势图 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收入趋势分析</span>
              <div class="header-actions">
                <el-radio-group v-model="trendType" size="small">
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
          <div class="revenue-chart">
            <div class="revenue-trend">
              <div class="trend-line">
                <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#1890ff" />
                      <stop offset="100%" stop-color="#52c41a" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="rgba(24, 144, 255, 0.3)" />
                      <stop offset="100%" stop-color="rgba(24, 144, 255, 0)" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L15,45 L30,48 L45,35 L60,40 L75,25 L90,30 L100,15" fill="none" stroke="url(#lineGradient)" stroke-width="2" />
                  <path d="M0,50 L15,45 L30,48 L45,35 L60,40 L75,25 L90,30 L100,15 L100,60 L0,60 Z" fill="url(#areaGradient)" />
                </svg>
              </div>
              <div class="trend-points">
                <div class="point" v-for="(item, index) in revenueTrend" :key="index" :style="{ left: (index / (revenueTrend.length - 1) * 100) + '%' }">
                  <span class="point-dot"></span>
                  <span class="point-label">¥{{ (item.value / 1000).toFixed(1) }}k</span>
                </div>
              </div>
            </div>
            <div class="trend-legend">
              <span v-for="(item, index) in revenueTrend" :key="index">{{ item.date }}</span>
            </div>
          </div>
          <div class="yoy-mom">
            <div class="compare-item">
              <span class="compare-label">同比</span>
              <span class="compare-value trend-up">+18.5%</span>
            </div>
            <div class="compare-item">
              <span class="compare-label">环比</span>
              <span class="compare-value trend-up">+8.2%</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>收入构成</span>
          </template>
          <div class="revenue-composition">
            <div class="composition-item" v-for="item in composition" :key="item.type">
              <div class="composition-header">
                <span class="composition-label">{{ item.label }}</span>
                <span class="composition-percent">{{ item.percent }}%</span>
              </div>
              <el-progress
                :percentage="item.percent"
                :stroke-width="14"
                :color="item.color"
                :show-text="false"
              />
              <span class="composition-value">¥{{ item.value.toLocaleString() }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 门店收入排行 + 收入预测 -->
    <el-row :gutter="20" class="bottom-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>门店收入排行</span>
              <el-button type="primary" link size="small">查看详情</el-button>
            </div>
          </template>
          <el-table :data="storeRanking" stripe size="small">
            <el-table-column type="index" label="排名" width="60">
              <template #default="{ $index }">
                <span class="rank-badge" :class="{ 'top-3': $index < 3 }">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="门店" />
            <el-table-column prop="revenue" label="收入" width="120">
              <template #default="{ row }">
                <span class="text-primary font-bold">¥{{ row.revenue.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="growth" label="增长" width="100">
              <template #default="{ row }">
                <span :class="row.growth >= 0 ? 'trend-up' : 'trend-down'">
                  {{ row.growth >= 0 ? '+' : '' }}{{ row.growth }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>收入预测（未来7天）</span>
              <el-tag type="info" size="small">基于历史数据</el-tag>
            </div>
          </template>
          <div class="forecast-list">
            <div class="forecast-item" v-for="item in forecast" :key="item.date">
              <div class="forecast-date">{{ item.date }}</div>
              <div class="forecast-range">
                <span class="forecast-min">¥{{ item.min.toLocaleString() }}</span>
                <span class="forecast-separator">~</span>
                <span class="forecast-max">¥{{ item.max.toLocaleString() }}</span>
              </div>
              <div class="forecast-bar">
                <div class="bar-fill" :style="{ width: (item.max / 50000 * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Top, Wallet, Calendar, DataAnalysis, Money } from '@element-plus/icons-vue'

// ---------- 统计数据 ----------
const stats = reactive({
  todayRevenue: 28560,
  weekRevenue: 189340,
  monthRevenue: 856780,
  totalRevenue: 2456780,
})

const trendType = ref('daily')
const dateRange = ref<string[]>([])

// ---------- 收入趋势 ----------
const revenueTrend = ref([
  { date: '03-31', value: 22340 },
  { date: '04-01', value: 25680 },
  { date: '04-02', value: 24120 },
  { date: '04-03', value: 28960 },
  { date: '04-04', value: 26780 },
  { date: '04-05', value: 30120 },
  { date: '04-06', value: 28560 },
])

// ---------- 收入构成 ----------
const composition = ref([
  { type: 'rental', label: '租金收入', value: 189340, percent: 68, color: '#1890ff' },
  { type: 'insurance', label: '保险收入', value: 45680, percent: 16, color: '#52c41a' },
  { type: 'service', label: '服务费', value: 28960, percent: 10, color: '#faad14' },
  { type: 'other', label: '其他收入', value: 16890, percent: 6, color: '#722ed1' },
])

// ---------- 门店排行 ----------
const storeRanking = ref([
  { name: '朝阳店', revenue: 56780, growth: 15.2 },
  { name: '海淀店', revenue: 45890, growth: 12.8 },
  { name: '西城店', revenue: 38920, growth: 8.5 },
  { name: '东城店', revenue: 32450, growth: 5.6 },
  { name: '丰台店', revenue: 28670, growth: -2.1 },
])

// ---------- 收入预测 ----------
const forecast = ref([
  { date: '04-07', min: 25600, max: 32400 },
  { date: '04-08', min: 27800, max: 35200 },
  { date: '04-09', min: 28900, max: 36800 },
  { date: '04-10', min: 26500, max: 33500 },
  { date: '04-11', min: 31200, max: 39800 },
  { date: '04-12', min: 35600, max: 45200 },
  { date: '04-13', min: 32400, max: 41200 },
])
</script>

<style lang="scss" scoped>
.analytics-revenue-container {
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
  &--info :deep(.el-card__body) { background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%); }
  &--primary .stat-card__icon { color: #1890ff; }
  &--success .stat-card__icon { color: #52c41a; }
  &--warning .stat-card__icon { color: #faad14; }
  &--info .stat-card__icon { color: #722ed1; }
}
.stat-card__content { display: flex; align-items: center; justify-content: space-between; }
.stat-card__info { flex: 1; }
.stat-card__label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.stat-card__value { font-size: 28px; font-weight: 700; color: var(--text-primary); line-height: 1.2; margin-bottom: 4px; }
.stat-card__trend { font-size: 12px; display: inline-flex; align-items: center; gap: 2px; }
.stat-card__sub { font-size: 12px; color: var(--text-secondary); }
.stat-card__icon { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.7); }
.trend-up { color: var(--success-color); }
.trend-down { color: var(--danger-color); }

// ========== 图表区域 ==========
.chart-row { margin-bottom: 20px; }
.card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; span { font-size: 16px; font-weight: 600; color: var(--text-primary); } }
.header-actions { display: flex; align-items: center; }

// ========== 收入趋势图 ==========
.revenue-chart { height: 260px; position: relative; }
.revenue-trend { position: relative; height: 200px; }
.trend-line { position: absolute; inset: 0; svg { width: 100%; height: 100%; } }
.trend-points { position: absolute; inset: 0; }
.point { position: absolute; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; }
.point-dot { width: 10px; height: 10px; background: #fff; border: 3px solid #1890ff; border-radius: 50%; }
.point-label { font-size: 11px; color: var(--text-secondary); margin-top: 8px; position: absolute; top: 20px; }
.trend-legend { display: flex; justify-content: space-between; padding-top: 20px; font-size: 12px; color: var(--text-placeholder); }
.yoy-mom { display: flex; gap: 20px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color-light); }
.compare-item { display: flex; align-items: center; gap: 8px; }
.compare-label { font-size: 13px; color: var(--text-secondary); }
.compare-value { font-size: 14px; font-weight: 600; }

// ========== 收入构成 ==========
.revenue-composition { padding: 10px 0; }
.composition-item { margin-bottom: 20px; }
.composition-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.composition-label { font-size: 14px; color: var(--text-primary); }
.composition-percent { font-size: 14px; font-weight: 600; color: var(--primary-color); }
.composition-value { font-size: 12px; color: var(--text-secondary); margin-top: 4px; display: block; }

// ========== 门店排行 ==========
.rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; font-weight: 600; background: #f5f5f5; color: var(--text-secondary); &.top-3 { background: linear-gradient(135deg, #faad14, #ffd666); color: #fff; } }
.text-primary { color: var(--primary-color); }
.font-bold { font-weight: 600; }

// ========== 收入预测 ==========
.forecast-list { padding: 10px 0; }
.forecast-item { display: flex; align-items: center; margin-bottom: 16px; gap: 16px; }
.forecast-date { width: 60px; font-size: 13px; color: var(--text-secondary); }
.forecast-range { width: 140px; font-size: 13px; }
.forecast-min { color: var(--text-regular); }
.forecast-separator { color: var(--text-placeholder); margin: 0 4px; }
.forecast-max { font-weight: 600; color: var(--primary-color); }
.forecast-bar { flex: 1; height: 8px; background: #f5f5f5; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #1890ff, #52c41a); border-radius: 4px; }

.bottom-row { margin-top: 20px; }
</style>