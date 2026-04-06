<template>
  <div class="report-list-container">
    <!-- 报表类型选择 -->
    <el-card shadow="hover" class="report-types-card">
      <template #header>
        <span>选择报表类型</span>
      </template>
      <div class="report-types-grid">
        <div
          class="report-type-item"
          :class="{ active: selectedType === 'financial' }"
          @click="selectedType = 'financial'"
        >
          <div class="type-icon type-icon--blue">
            <el-icon :size="32"><Money /></el-icon>
          </div>
          <div class="type-info">
            <h4 class="type-title">财务报表</h4>
            <p class="type-desc">收支明细/对账单/结算单/利润表</p>
          </div>
        </div>
        <div
          class="report-type-item"
          :class="{ active: selectedType === 'operation' }"
          @click="selectedType = 'operation'"
        >
          <div class="type-icon type-icon--green">
            <el-icon :size="32"><DataAnalysis /></el-icon>
          </div>
          <div class="type-info">
            <h4 class="type-title">运营报表</h4>
            <p class="type-desc">用户增长/订单趋势/车辆利用率</p>
          </div>
        </div>
        <div
          class="report-type-item"
          :class="{ active: selectedType === 'marketing' }"
          @click="selectedType = 'marketing'"
        >
          <div class="type-icon type-icon--orange">
            <el-icon :size="32"><TrendCharts /></el-icon>
          </div>
          <div class="type-info">
            <h4 class="type-title">营销报表</h4>
            <p class="type-desc">活动效果/优惠券使用/ROI分析</p>
          </div>
        </div>
        <div
          class="report-type-item"
          :class="{ active: selectedType === 'custom' }"
          @click="selectedType = 'custom'"
        >
          <div class="type-icon type-icon--purple">
            <el-icon :size="32"><Setting /></el-icon>
          </div>
          <div class="type-info">
            <h4 class="type-title">自定义报表</h4>
            <p class="type-desc">选择指标和维度自由组合</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 报表筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
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
        <el-form-item label="门店">
          <el-select v-model="filterForm.storeId" placeholder="全部门店" clearable style="width: 150px;">
            <el-option v-for="store in storeList" :key="store.id" :label="store.name" :value="store.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="车型">
          <el-select v-model="filterForm.vehicleType" placeholder="全部车型" clearable style="width: 150px;">
            <el-option label="小牛NQi Pro" value="niu_nqi_pro" />
            <el-option label="雅迪DE3" value="yadea_de3" />
            <el-option label="九号C90" value="ninebot_c90" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="generateReport">生成报表</el-button>
          <el-button :icon="Download" @click="exportReport">导出Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报表内容 -->
    <el-card shadow="hover" class="report-content-card">
      <template #header>
        <div class="card-header">
          <span>{{ reportTitle }}</span>
          <div class="header-actions">
            <el-button type="primary" link size="small" :icon="Refresh">刷新数据</el-button>
            <el-button type="primary" link size="small" :icon="Printer">打印</el-button>
          </div>
        </div>
      </template>

      <!-- 汇总卡片 -->
      <el-row :gutter="20" class="summary-cards">
        <el-col :xs="12" :sm="6">
          <div class="summary-item">
            <span class="summary-label">总收入</span>
            <span class="summary-value text-primary">¥{{ summaryData.totalRevenue.toLocaleString() }}</span>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-item">
            <span class="summary-label">总支出</span>
            <span class="summary-value text-danger">¥{{ summaryData.totalExpense.toLocaleString() }}</span>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-item">
            <span class="summary-label">净利润</span>
            <span class="summary-value text-success">¥{{ summaryData.netProfit.toLocaleString() }}</span>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-item">
            <span class="summary-label">订单数</span>
            <span class="summary-value">{{ summaryData.orderCount }} 单</span>
          </div>
        </el-col>
      </el-row>

      <!-- 报表表格 -->
      <el-table :data="reportData" stripe style="width: 100%" show-summary :summary-method="getSummaries">
        <el-table-column prop="date" label="日期" width="120" fixed />
        <el-table-column prop="rentalIncome" label="租金收入" width="120">
          <template #default="{ row }">
            <span class="text-primary">¥{{ row.rentalIncome.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="insuranceIncome" label="保险收入" width="120">
          <template #default="{ row }">
            <span>¥{{ row.insuranceIncome.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="serviceFee" label="服务费" width="100">
          <template #default="{ row }">
            <span>¥{{ row.serviceFee.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="refundAmount" label="退款金额" width="100">
          <template #default="{ row }">
            <span class="text-danger">-¥{{ row.refundAmount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="netIncome" label="净收入" width="120">
          <template #default="{ row }">
            <span class="font-bold" :class="row.netIncome >= 0 ? 'text-success' : 'text-danger'">
              ¥{{ row.netIncome.toLocaleString() }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="80" />
        <el-table-column prop="avgOrderValue" label="客单价" width="100">
          <template #default="{ row }">
            <span>¥{{ row.avgOrderValue }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRecords"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Money, DataAnalysis, TrendCharts, Setting, Search, Download, Refresh, Printer } from '@element-plus/icons-vue'

// ---------- 报表类型 ----------
const selectedType = ref('financial')

const reportTitle = computed(() => {
  const titles: Record<string, string> = {
    financial: '财务报表 - 收支明细',
    operation: '运营报表 - 综合分析',
    marketing: '营销报表 - 效果分析',
    custom: '自定义报表',
  }
  return titles[selectedType.value]
})

// ---------- 筛选条件 ----------
const filterForm = reactive({
  dateRange: [] as string[],
  storeId: '',
  vehicleType: '',
})

const storeList = ref([
  { id: 'S001', name: '朝阳店' },
  { id: 'S002', name: '海淀店' },
  { id: 'S003', name: '西城店' },
  { id: 'S004', name: '东城店' },
])

// ---------- 汇总数据 ----------
const summaryData = reactive({
  totalRevenue: 289560,
  totalExpense: 45680,
  netProfit: 243880,
  orderCount: 1856,
})

// ---------- 报表数据 ----------
interface ReportRow {
  date: string
  rentalIncome: number
  insuranceIncome: number
  serviceFee: number
  refundAmount: number
  netIncome: number
  orderCount: number
  avgOrderValue: number
}

const reportData = ref<ReportRow[]>([
  { date: '2026-04-01', rentalIncome: 15680, insuranceIncome: 2340, serviceFee: 1568, refundAmount: 0, netIncome: 19588, orderCount: 98, avgOrderValue: 200 },
  { date: '2026-04-02', rentalIncome: 18920, insuranceIncome: 2890, serviceFee: 1892, refundAmount: 500, netIncome: 23202, orderCount: 112, avgOrderValue: 207 },
  { date: '2026-04-03', rentalIncome: 22450, insuranceIncome: 3120, serviceFee: 2245, refundAmount: 1200, netIncome: 26615, orderCount: 145, avgOrderValue: 183 },
  { date: '2026-04-04', rentalIncome: 20180, insuranceIncome: 2780, serviceFee: 2018, refundAmount: 0, netIncome: 24978, orderCount: 132, avgOrderValue: 189 },
  { date: '2026-04-05', rentalIncome: 25680, insuranceIncome: 3450, serviceFee: 2568, refundAmount: 800, netIncome: 30898, orderCount: 168, avgOrderValue: 184 },
  { date: '2026-04-06', rentalIncome: 28960, insuranceIncome: 3980, serviceFee: 2896, refundAmount: 1500, netIncome: 34336, orderCount: 189, avgOrderValue: 182 },
])

const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(1856)

// ---------- 方法 ----------
function generateReport(): void {
  console.log('生成报表:', { selectedType: selectedType.value, ...filterForm })
}

function exportReport(): void {
  console.log('导出报表')
}

function getSummaries(param: { columns: any[]; data: ReportRow[] }): (string | VNode)[] {
  const { columns } = param
  const sums: (string | VNode)[] = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    const values = reportData.value.map(item => Number(item[column.property as keyof ReportRow]) || 0)
    const sum = values.reduce((prev, curr) => prev + curr, 0)
    if (['rentalIncome', 'insuranceIncome', 'serviceFee', 'refundAmount', 'netIncome'].includes(column.property)) {
      sums[index] = `¥${sum.toLocaleString()}`
    } else if (column.property === 'orderCount') {
      sums[index] = sum.toString()
    } else if (column.property === 'avgOrderValue') {
      sums[index] = `¥${Math.round(sum / reportData.value.length)}`
    } else {
      sums[index] = '-'
    }
  })
  return sums
}
</script>

<style lang="scss" scoped>
.report-list-container {
  max-width: 1440px;
}

// ========== 报表类型选择 ==========
.report-types-card {
  margin-bottom: 20px;
}

.report-types-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.report-type-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    border-color: var(--primary-color);
    background: #e6f7ff;
  }
}

.type-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;

  &--blue { background: linear-gradient(135deg, #1890ff, #69c0ff); }
  &--green { background: linear-gradient(135deg, #52c41a, #95de64); }
  &--orange { background: linear-gradient(135deg, #faad14, #ffd666); }
  &--purple { background: linear-gradient(135deg, #722ed1, #b37feb); }
}

.type-info {
  flex: 1;
}

.type-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.type-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

// ========== 筛选条件 ==========
.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

// ========== 报表内容 ==========
.report-content-card {
  margin-bottom: 20px;
}

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

.header-actions {
  display: flex;
  gap: 10px;
}

// ========== 汇总卡片 ==========
.summary-cards {
  margin-bottom: 20px;
}

.summary-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
}

.text-primary { color: var(--primary-color); }
.text-success { color: var(--success-color); }
.text-danger { color: var(--danger-color); }
.font-bold { font-weight: 600; }

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1200px) {
  .report-types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>