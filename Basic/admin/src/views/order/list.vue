<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <el-button type="primary" :icon="Plus">新建订单</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="订单编号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input v-model="searchForm.customerName" placeholder="客户姓名" clearable />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px;">
            <el-option label="进行中" value="ongoing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">搜索</el-button>
          <el-button :icon="RefreshLeft">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="[]" stripe border style="width: 100%;">
        <el-table-column prop="orderNo" label="订单编号" width="200" />
        <el-table-column prop="customerName" label="客户" width="110" />
        <el-table-column prop="vehicleModel" label="车辆型号" min-width="150" />
        <el-table-column prop="storeName" label="取车门店" width="130" />
        <el-table-column prop="startTime" label="开始时间" width="170" />
        <el-table-column prop="endTime" label="结束时间" width="170" />
        <el-table-column prop="totalAmount" label="金额(元)" width="100">
          <template #default="{ row }">
            <span class="text-primary font-bold">¥{{ row.totalAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default>
            <el-button link type="primary" size="small">详情</el-button>
            <el-button link type="warning" size="small">退款</el-button>
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
import { reactive } from 'vue'
import { Plus, Search, RefreshLeft } from '@element-plus/icons-vue'

const searchForm = reactive({
  orderNo: '',
  customerName: '',
  status: '',
})

function getStatusType(status: string): string {
  const map: Record<string, string> = {
    ongoing: 'primary',
    completed: 'success',
    cancelled: 'info',
  }
  return map[status] || ''
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}
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
