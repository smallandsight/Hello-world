<template>
  <div class="activity-list-container">
    <!-- 搜索和操作栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="活动名称">
          <el-input v-model="filterForm.keyword" placeholder="搜索活动名称" clearable style="width: 200px;" />
        </el-form-item>
        <el-form-item label="活动类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 140px;">
            <el-option label="限时特价" value="flash_sale" />
            <el-option label="满减活动" value="discount" />
            <el-option label="新人专享" value="new_user" />
            <el-option label="会员专享" value="member_only" />
            <el-option label="邀请有礼" value="invitation" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px;">
            <el-option label="草稿" value="draft" />
            <el-option label="已上架" value="active" />
            <el-option label="已下架" value="inactive" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">搜索</el-button>
          <el-button :icon="Plus" @click="$router.push('/activity/create')">新建活动</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 活动列表 -->
    <el-card shadow="hover" class="activity-table-card">
      <el-table :data="activityList" stripe style="width: 100%">
        <el-table-column prop="id" label="活动ID" width="100" />
        <el-table-column prop="name" label="活动名称" min-width="180">
          <template #default="{ row }">
            <div class="activity-name">
              <span class="name-text">{{ row.name }}</span>
              <el-tag v-if="row.isNew" type="danger" size="small" effect="dark" class="new-tag">新</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="活动类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small" effect="dark">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="活动时间" min-width="180">
          <template #default="{ row }">
            <div class="time-range">
              <span>{{ row.startTime }}</span>
              <span class="time-separator">至</span>
              <span>{{ row.endTime }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="participantCount" label="参与人数" width="100" />
        <el-table-column prop="conversionRate" label="转化率" width="100">
          <template #default="{ row }">
            <span class="text-primary">{{ row.conversionRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="gmv" label="贡献GMV" width="120">
          <template #default="{ row }">
            <span class="text-success font-bold">¥{{ row.gmv.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="primary" link size="small" @click="editActivity(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              link
              size="small"
              @click="toggleStatus(row, 'inactive')"
            >
              下架
            </el-button>
            <el-button
              v-else-if="row.status === 'draft' || row.status === 'inactive'"
              type="success"
              link
              size="small"
              @click="toggleStatus(row, 'active')"
            >
              上架
            </el-button>
            <el-button type="danger" link size="small" @click="deleteActivity(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRecords"
        />
      </div>
    </el-card>

    <!-- 活动效果概览 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>活动参与趋势</span>
          </template>
          <div class="mini-chart">
            <div class="mini-bar" v-for="(item, index) in participationTrend" :key="index" :style="{ height: item + '%' }"></div>
          </div>
          <div class="mini-stat">
            <span class="mini-label">本周参与</span>
            <span class="mini-value">+{{ participationTrend.reduce((a, b) => a + b, 0) }} 人</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>活动转化率</span>
          </template>
          <div class="conversion-ring">
            <span class="ring-value">68.5%</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">整体转化</span>
            <span class="mini-value trend-up">+5.2%</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>活动GMV贡献</span>
          </template>
          <div class="gmv-display">
            <span class="gmv-value">¥{{ gmvTotal.toLocaleString() }}</span>
            <span class="gmv-percent">占总营收 32%</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">本月活动收入</span>
            <span class="mini-value trend-up">+12.8%</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'

// ---------- 筛选条件 ----------
const filterForm = reactive({
  keyword: '',
  type: '',
  status: '',
})

// ---------- 活动列表 ----------
interface ActivityItem {
  id: string
  name: string
  type: string
  status: string
  startTime: string
  endTime: string
  participantCount: number
  conversionRate: number
  gmv: number
  isNew?: boolean
}

const activityList = ref<ActivityItem[]>([
  { id: 'A001', name: '清明小长假限时特价', type: 'flash_sale', status: 'active', startTime: '2026-04-04', endTime: '2026-04-06', participantCount: 1256, conversionRate: 72.5, gmv: 45680, isNew: true },
  { id: 'A002', name: '新用户首单立减20元', type: 'new_user', status: 'active', startTime: '2026-04-01', endTime: '2026-04-30', participantCount: 3456, conversionRate: 85.2, gmv: 89650 },
  { id: 'A003', name: '会员专享9折优惠', type: 'member_only', status: 'active', startTime: '2026-04-01', endTime: '2026-06-30', participantCount: 1890, conversionRate: 68.3, gmv: 56780 },
  { id: 'A004', name: '满100减15', type: 'discount', status: 'active', startTime: '2026-03-15', endTime: '2026-04-15', participantCount: 2890, conversionRate: 56.8, gmv: 78920 },
  { id: 'A005', name: '邀请好友送50积分', type: 'invitation', status: 'active', startTime: '2026-01-01', endTime: '2026-12-31', participantCount: 5678, conversionRate: 45.2, gmv: 123450 },
  { id: 'A006', name: '春节限时特价', type: 'flash_sale', status: 'ended', startTime: '2026-01-25', endTime: '2026-02-10', participantCount: 4567, conversionRate: 78.9, gmv: 156780 },
])

const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(56)

// ---------- 概览数据 ----------
const participationTrend = ref([45, 68, 52, 78, 89, 95, 72])
const gmvTotal = ref(456780)

// ---------- 方法 ----------
function getTypeTagType(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    flash_sale: 'danger',
    discount: 'warning',
    new_user: 'success',
    member_only: 'primary',
    invitation: 'info',
  }
  return map[type] || 'info'
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    flash_sale: '限时特价',
    discount: '满减活动',
    new_user: '新人专享',
    member_only: '会员专享',
    invitation: '邀请有礼',
  }
  return map[type] || '未知'
}

function getStatusTagType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    draft: 'info',
    active: 'success',
    inactive: 'warning',
    ended: 'danger',
  }
  return map[status] || 'info'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    active: '已上架',
    inactive: '已下架',
    ended: '已结束',
  }
  return map[status] || '未知'
}

function viewDetail(activity: ActivityItem): void {
  console.log('查看详情:', activity)
}

function editActivity(activity: ActivityItem): void {
  console.log('编辑活动:', activity)
}

function toggleStatus(activity: ActivityItem, newStatus: string): void {
  console.log('切换状态:', activity.id, newStatus)
  activity.status = newStatus
}

function deleteActivity(activity: ActivityItem): void {
  console.log('删除活动:', activity)
}
</script>

<style lang="scss" scoped>
.activity-list-container {
  max-width: 1440px;
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

// ========== 活动表格 ==========
.activity-table-card {
  margin-bottom: 20px;
}

.activity-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 500;
}

.new-tag {
  font-size: 10px;
}

.time-range {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: var(--text-secondary);
}

.time-separator {
  color: var(--text-placeholder);
}

.text-primary { color: var(--primary-color); }
.text-success { color: var(--success-color); }
.font-bold { font-weight: 600; }
.trend-up { color: var(--success-color); }

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

// ========== 概览卡片 ==========
.overview-row {
  margin-top: 20px;
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 60px;
  padding: 10px 0;
}

.mini-bar {
  width: 20px;
  background: linear-gradient(180deg, #1890ff, #69c0ff);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.mini-stat {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color-light);
}

.mini-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.mini-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.conversion-ring {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 8px solid #e6f7ff;
    border-top-color: #1890ff;
  }
}

.ring-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

.gmv-display {
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gmv-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--success-color);
}

.gmv-percent {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>