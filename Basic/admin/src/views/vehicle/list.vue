<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>车辆管理</span>
          <el-button type="primary" :icon="Plus">添加车辆</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="车牌号/编号">
          <el-input v-model="searchForm.plateNo" placeholder="请输入" clearable />
        </el-form-item>
        <el-form-item label="车型">
          <el-input v-model="searchForm.model" placeholder="请输入车型名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px;">
            <el-option label="可用" value="available" />
            <el-option label="租赁中" value="rented" />
            <el-option label="维护中" value="maintenance" />
            <el-option label="已下架" value="offline" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">搜索</el-button>
          <el-button :icon="RefreshLeft">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="[]" stripe border style="width: 100%;">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="plateNo" label="编号" width="120" />
        <el-table-column prop="model" label="车型" min-width="150" />
        <el-table-column prop="storeName" label="所属门店" width="130" />
        <el-table-column prop="batteryLevel" label="电量(%)" width="90" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.batteryLevel || 0" :stroke-width="6" :show-text="false" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastMileage" label="总里程(km)" width="110" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default>
            <el-button link type="primary" size="small">详情</el-button>
            <el-button link type="warning" size="small">编辑</el-button>
            <el-button link type="danger" size="small">下架</el-button>
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
  plateNo: '',
  model: '',
  status: '',
})

function getStatusType(status: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    available: 'success',
    rented: 'primary',
    maintenance: 'warning',
    offline: 'info',
  }
  return map[status] || ''
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    available: '可用',
    rented: '租赁中',
    maintenance: '维护中',
    offline: '已下架',
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
