<template>
  <div class="tools-batch-container">
    <el-row :gutter="20">
      <!-- 左侧工具列表 -->
      <el-col :span="8">
        <el-card shadow="hover" class="tool-list-card">
          <template #header>
            <span>批量工具</span>
          </template>
          <div class="tool-grid">
            <div
              v-for="tool in tools"
              :key="tool.id"
              class="tool-item"
              :class="{ active: selectedTool === tool.id }"
              @click="selectTool(tool.id)"
            >
              <div class="tool-icon" :style="{ background: tool.color }">
                <el-icon :size="28"><component :is="tool.icon" /></el-icon>
              </div>
              <div class="tool-info">
                <h4 class="tool-title">{{ tool.name }}</h4>
                <p class="tool-desc">{{ tool.desc }}</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧操作面板 -->
      <el-col :span="16">
        <!-- 批量上架 -->
        <el-card v-if="selectedTool === 'batch_online'" shadow="hover" class="operation-card">
          <template #header>
            <div class="card-header">
              <span>批量上架车辆</span>
              <el-tag type="info">已选择 {{ selectedVehicles.length }} 辆</el-tag>
            </div>
          </template>
          <div class="operation-content">
            <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
              选择需要上架的车辆，批量修改状态为"可用"
            </el-alert>
            <el-form :model="batchOnlineForm" label-width="100px">
              <el-form-item label="选择车辆">
                <el-button type="primary" :icon="Plus" @click="showVehicleSelector = true">选择车辆</el-button>
                <span class="selected-info">已选 {{ selectedVehicles.length }} 辆</span>
              </el-form-item>
              <el-form-item label="上架门店">
                <el-select v-model="batchOnlineForm.storeId" placeholder="选择上架门店" style="width: 300px;">
                  <el-option label="朝阳店" value="S001" />
                  <el-option label="海淀店" value="S002" />
                  <el-option label="西城店" value="S003" />
                </el-select>
              </el-form-item>
              <el-form-item label="生效时间">
                <el-radio-group v-model="batchOnlineForm.effectTime">
                  <el-radio value="now">立即生效</el-radio>
                  <el-radio value="schedule">定时生效</el-radio>
                </el-radio-group>
                <el-date-picker
                  v-if="batchOnlineForm.effectTime === 'schedule'"
                  v-model="batchOnlineForm.scheduleTime"
                  type="datetime"
                  placeholder="选择时间"
                  style="margin-left: 10px;"
                />
              </el-form-item>
            </el-form>
            <div class="operation-actions">
              <el-button type="primary" size="large" @click="executeBatchOnline">确认上架</el-button>
            </div>
          </div>
        </el-card>

        <!-- 批量调价 -->
        <el-card v-if="selectedTool === 'batch_price'" shadow="hover" class="operation-card">
          <template #header>
            <div class="card-header">
              <span>批量调价</span>
              <el-tag type="warning">谨慎操作</el-tag>
            </div>
          </template>
          <div class="operation-content">
            <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 20px;">
              批量调整车辆租金价格，请谨慎操作
            </el-alert>
            <el-form :model="batchPriceForm" label-width="120px">
              <el-form-item label="选择车型">
                <el-select v-model="batchPriceForm.vehicleModels" multiple placeholder="选择车型" style="width: 300px;">
                  <el-option label="小牛NQi Pro" value="niu_nqi_pro" />
                  <el-option label="雅迪DE3" value="yadea_de3" />
                  <el-option label="九号C90" value="ninebot_c90" />
                </el-select>
              </el-form-item>
              <el-form-item label="调价方式">
                <el-radio-group v-model="batchPriceForm.adjustType">
                  <el-radio value="percent">按百分比</el-radio>
                  <el-radio value="fixed">按固定金额</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="调整幅度">
                <el-input-number
                  v-model="batchPriceForm.adjustValue"
                  :precision="batchPriceForm.adjustType === 'percent' ? 1 : 0"
                  :min="-50"
                  :max="100"
                  style="width: 200px;"
                />
                <span class="input-suffix">
                  {{ batchPriceForm.adjustType === 'percent' ? '%' : '元' }}
                  （负数为降价）
                </span>
              </el-form-item>
              <el-form-item label="生效门店">
                <el-checkbox-group v-model="batchPriceForm.stores">
                  <el-checkbox value="S001">朝阳店</el-checkbox>
                  <el-checkbox value="S002">海淀店</el-checkbox>
                  <el-checkbox value="S003">西城店</el-checkbox>
                  <el-checkbox value="S004">东城店</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
            <div class="operation-actions">
              <el-button size="large">预览影响</el-button>
              <el-button type="primary" size="large" @click="executeBatchPrice">确认调价</el-button>
            </div>
          </div>
        </el-card>

        <!-- 批量通知 -->
        <el-card v-if="selectedTool === 'batch_notify'" shadow="hover" class="operation-card">
          <template #header>
            <div class="card-header">
              <span>批量通知</span>
              <el-tag type="info">消息推送</el-tag>
            </div>
          </template>
          <div class="operation-content">
            <el-form :model="batchNotifyForm" label-width="100px">
              <el-form-item label="通知类型">
                <el-select v-model="batchNotifyForm.notifyType" style="width: 200px;">
                  <el-option label="系统通知" value="system" />
                  <el-option label="活动通知" value="activity" />
                  <el-option label="订单提醒" value="order" />
                </el-select>
              </el-form-item>
              <el-form-item label="目标用户">
                <el-radio-group v-model="batchNotifyForm.targetType">
                  <el-radio value="all">全部用户</el-radio>
                  <el-radio value="segment">按用户群</el-radio>
                  <el-radio value="custom">自定义筛选</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="batchNotifyForm.targetType === 'segment'" label="用户分群">
                <el-select v-model="batchNotifyForm.segments" multiple placeholder="选择用户群" style="width: 300px;">
                  <el-option label="高价值用户" value="high_value" />
                  <el-option label="活跃用户" value="active" />
                  <el-option label="沉睡用户" value="dormant" />
                </el-select>
              </el-form-item>
              <el-form-item label="通知标题">
                <el-input v-model="batchNotifyForm.title" placeholder="请输入通知标题" style="width: 400px;" />
              </el-form-item>
              <el-form-item label="通知内容">
                <el-input
                  v-model="batchNotifyForm.content"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入通知内容"
                  style="width: 400px;"
                />
              </el-form-item>
              <el-form-item label="发送时间">
                <el-radio-group v-model="batchNotifyForm.sendTime">
                  <el-radio value="now">立即发送</el-radio>
                  <el-radio value="schedule">定时发送</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
            <div class="operation-actions">
              <el-button size="large">预览通知</el-button>
              <el-button type="primary" size="large" @click="executeBatchNotify">发送通知</el-button>
            </div>
          </div>
        </el-card>

        <!-- 数据导入导出 -->
        <el-card v-if="selectedTool === 'data_import_export'" shadow="hover" class="operation-card">
          <template #header>
            <div class="card-header">
              <span>数据导入导出</span>
            </div>
          </template>
          <div class="operation-content">
            <el-tabs v-model="importExportTab">
              <el-tab-pane label="数据导出" name="export">
                <el-form :model="exportForm" label-width="100px" style="margin-top: 20px;">
                  <el-form-item label="导出类型">
                    <el-select v-model="exportForm.type" style="width: 200px;">
                      <el-option label="订单数据" value="orders" />
                      <el-option label="用户数据" value="users" />
                      <el-option label="车辆数据" value="vehicles" />
                      <el-option label="财务数据" value="finance" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="时间范围">
                    <el-date-picker
                      v-model="exportForm.dateRange"
                      type="daterange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                    />
                  </el-form-item>
                  <el-form-item label="导出格式">
                    <el-radio-group v-model="exportForm.format">
                      <el-radio value="xlsx">Excel (.xlsx)</el-radio>
                      <el-radio value="csv">CSV (.csv)</el-radio>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :icon="Download">开始导出</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>
              <el-tab-pane label="数据导入" name="import">
                <el-upload
                  class="upload-area"
                  drag
                  action="#"
                  :auto-upload="false"
                  accept=".xlsx,.xls,.csv"
                >
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">
                    将文件拖到此处，或<em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      支持 Excel (.xlsx/.xls) 或 CSV 格式，单文件不超过 10MB
                    </div>
                  </template>
                </el-upload>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 车辆选择器弹窗 -->
    <el-dialog v-model="showVehicleSelector" title="选择车辆" width="800px">
      <el-table :data="vehicleList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="车辆ID" width="100" />
        <el-table-column prop="model" label="车型" />
        <el-table-column prop="plateNumber" label="车牌号" width="120" />
        <el-table-column prop="status" label="当前状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'offline' ? 'info' : 'success'" size="small">
              {{ row.status === 'offline' ? '已下架' : '可用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="storeName" label="所属门店" />
      </el-table>
      <template #footer>
        <el-button @click="showVehicleSelector = false">取消</el-button>
        <el-button type="primary" @click="confirmSelection">确认选择</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, markRaw } from 'vue'
import { Plus, Download, UploadFilled, Upload, Document, Bell, Setting } from '@element-plus/icons-vue'

// ---------- 工具列表 ----------
const tools = ref([
  { id: 'batch_online', name: '批量上架', desc: '批量上架车辆', icon: markRaw(Upload), color: 'linear-gradient(135deg, #52c41a, #95de64)' },
  { id: 'batch_price', name: '批量调价', desc: '调整租金价格', icon: markRaw(Setting), color: 'linear-gradient(135deg, #faad14, #ffd666)' },
  { id: 'batch_notify', name: '批量通知', desc: '群发消息推送', icon: markRaw(Bell), color: 'linear-gradient(135deg, #1890ff, #69c0ff)' },
  { id: 'data_import_export', name: '数据导入导出', desc: '批量数据处理', icon: markRaw(Document), color: 'linear-gradient(135deg, #722ed1, #b37feb)' },
])

const selectedTool = ref('batch_online')

// ---------- 批量上架表单 ----------
const batchOnlineForm = reactive({
  storeId: '',
  effectTime: 'now',
  scheduleTime: '',
})

// ---------- 批量调价表单 ----------
const batchPriceForm = reactive({
  vehicleModels: [] as string[],
  adjustType: 'percent',
  adjustValue: 0,
  stores: [] as string[],
})

// ---------- 批量通知表单 ----------
const batchNotifyForm = reactive({
  notifyType: 'system',
  targetType: 'all',
  segments: [] as string[],
  title: '',
  content: '',
  sendTime: 'now',
})

// ---------- 导入导出 ----------
const importExportTab = ref('export')
const exportForm = reactive({
  type: 'orders',
  dateRange: [] as string[],
  format: 'xlsx',
})

// ---------- 车辆选择 ----------
const showVehicleSelector = ref(false)
const selectedVehicles = ref<any[]>([])
const vehicleList = ref([
  { id: 'V001', model: '小牛NQi Pro', plateNumber: '京A12345', status: 'offline', storeName: '朝阳店' },
  { id: 'V002', model: '雅迪DE3', plateNumber: '京A12346', status: 'offline', storeName: '海淀店' },
  { id: 'V003', model: '九号C90', plateNumber: '京A12347', status: 'offline', storeName: '西城店' },
  { id: 'V004', model: '小牛MQi2', plateNumber: '京A12348', status: 'available', storeName: '东城店' },
])

function selectTool(toolId: string): void {
  selectedTool.value = toolId
}

function handleSelectionChange(selection: any[]): void {
  selectedVehicles.value = selection
}

function confirmSelection(): void {
  showVehicleSelector.value = false
}

function executeBatchOnline(): void {
  console.log('执行批量上架:', batchOnlineForm)
}

function executeBatchPrice(): void {
  console.log('执行批量调价:', batchPriceForm)
}

function executeBatchNotify(): void {
  console.log('执行批量通知:', batchNotifyForm)
}
</script>

<style lang="scss" scoped>
.tools-batch-container {
  max-width: 1440px;
}

// ========== 工具列表 ==========
.tool-list-card {
  height: 100%;
}

.tool-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-item {
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

.tool-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #fff;
}

.tool-info {
  flex: 1;
}

.tool-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tool-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

// ========== 操作面板 ==========
.operation-card {
  min-height: 400px;
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

.operation-content {
  padding: 10px 0;
}

.selected-info {
  margin-left: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.input-suffix {
  margin-left: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.operation-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color-light);
  display: flex;
  gap: 12px;
}

.upload-area {
  margin-top: 20px;
}
</style>