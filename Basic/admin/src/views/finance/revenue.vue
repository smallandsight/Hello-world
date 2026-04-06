<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>收入统计</span>
          <el-button type="primary" :icon="Download">导出报表</el-button>
        </div>
      </template>

      <!-- 筛选区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px;"
          />
        </el-form-item>
        <el-form-item label="门店">
          <el-select v-model="storeId" placeholder="全部门店" clearable style="width: 150px;">
            <el-option label="全部" value="" />
            <!-- 动态加载 -->
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">查询</el-button>
        </el-form-item>
      </el-form>

      <!-- 统计概览 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :span="6">
          <el-statistic title="总收入(元)" :value="0" suffix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="订单总数" :value="0" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="客单价(元)" :value="0" prefix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="退款金额(元)" :value="0" prefix="-¥" value-style={{ color: '#ff4d4f' }} />
        </el-col>
      </el-row>

      <!-- 图表占位 -->
      <div class="chart-placeholder">
        <p>收入趋势图表（对接 ECharts 后展示）</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Download } from '@element-plus/icons-vue'

const dateRange = ref<string[]>([])
const storeId = ref('')
</script>

<style lang="scss" scoped>
.page-container { max-width: 1440px; }
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
.search-form { margin-bottom: 20px; }
.stat-row {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafbfc;
  border-radius: var(--radius-md);
}
.chart-placeholder {
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-color-light);

  p {
    color: var(--text-placeholder);
    font-size: 14px;
  }
}
</style>
