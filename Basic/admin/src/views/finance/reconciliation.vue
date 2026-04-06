<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>对账管理</span>
          <el-button type="primary" :icon="Download">导出对账单</el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="对账周期">
          <el-date-picker
            v-model="month"
            type="month"
            placeholder="选择月份"
            value-format="YYYY-MM"
            style="width: 160px;"
          />
        </el-form-item>
        <el-form-item label="门店">
          <el-select v-model="storeId" placeholder="全部门店" clearable style="width: 150px;">
            <el-option label="全部" value="" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 120px;">
            <el-option label="已对账" value="reconciled" />
            <el-option label="待对账" value="pending" />
            <el-option label="异常" value="exception" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">查询</el-button>
        </el-form-item>
      </el-form>

      <!-- 对账列表 -->
      <el-table :data="[]" stripe border style="width: 100%;">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="period" label="对账周期" width="130" />
        <el-table-column prop="storeName" label="门店" width="130" />
        <el-table-column prop="orderCount" label="订单数" width="90" align="center" />
        <el-table-column prop="totalAmount" label="平台收入(元)" width="130" align="right">
          <template #default="{ row }">
            <span>¥{{ row.totalAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="platformFee" label="平台手续费(元)" width="140" align="right">
          <template #default="{ row }">
            <span class="text-danger">¥{{ row.platformFee }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="settlementAmount" label="结算金额(元)" width="140" align="right">
          <template #default="{ row }">
            <span class="text-success font-bold">¥{{ row.settlementAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'reconciled' ? 'success' : row.status === 'pending' ? 'warning' : 'danger'" size="small">
              {{ { reconciled: '已对账', pending: '待对账', exception: '异常' }[String(row.status)] || '' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default>
            <el-button link type="primary" size="small">查看详情</el-button>
            <el-button link type="success" size="small">确认对账</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="0"
          :page-sizes="[10, 20, 50]"
          :page-size="10"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Download } from '@element-plus/icons-vue'

const month = ref('')
const storeId = ref('')
const status = ref('')
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
.search-form { margin-bottom: 16px; }
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
