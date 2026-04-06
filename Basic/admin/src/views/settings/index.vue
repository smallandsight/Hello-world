<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>
        <span class="card-title">系统设置</span>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form :model="basicForm" label-width="140px" style="max-width: 600px; margin-top: 16px;">
            <el-form-item label="平台名称">
              <el-input v-model="basicForm.platformName" placeholder="古月租车" />
            </el-form-item>
            <el-form-item logo="平台Logo">
              <div class="logo-upload">
                <el-avatar :size="80" :icon="PictureFilled" />
                <p class="upload-tip">支持 JPG/PNG，建议尺寸 200×200px</p>
              </div>
            </el-form-item>
            <el-form-item label="客服电话">
              <el-input v-model="basicForm.servicePhone" placeholder="400-xxx-xxxx" />
            </el-form-item>
            <el-form-item label="营业时间">
              <el-time-picker
                v-model="basicForm.businessHours"
                is-range
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="HH:mm"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary">保存修改</el-button>
              <el-button>重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <el-form label-width="160px" style="max-width: 600px; margin-top: 16px;">
            <el-form-item label="当前密码">
              <el-input type="password" show-password placeholder="输入当前密码以确认身份" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input type="password" show-password placeholder="请输入新密码（6位以上）" />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input type="password" show-password placeholder="再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 通知设置 -->
        <el-tab-pane label="通知设置" name="notification">
          <div class="notify-section">
            <h4>订单通知</h4>
            <div class="notify-item">
              <span>新订单提醒</span>
              <el-switch v-model="notifySettings.newOrder" />
            </div>
            <div class="notify-item">
              <span>异常订单告警</span>
              <el-switch v-model="notifySettings.orderException" />
            </div>
            <div class="notify-item">
              <span>退款通知</span>
              <el-switch v-model="notifySettings.refund" />
            </div>
            <hr class="divider" />
            <h4>车辆通知</h4>
            <div class="notify-item">
              <span>低电量预警</span>
              <el-switch v-model="notifySettings.lowBattery" />
            </div>
            <div class="notify-item">
              <span>维护到期提醒</span>
              <el-switch v-model="notifySettings.maintenanceDue" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { PictureFilled } from '@element-plus/icons-vue'

const activeTab = ref('basic')

const basicForm = reactive({
  platformName: '古月租车',
  servicePhone: '',
  businessHours: ['08:00', '22:00'] as string[],
})

const notifySettings = reactive({
  newOrder: true,
  orderException: true,
  refund: true,
  lowBattery: true,
  maintenanceDue: true,
})
</script>

<style lang="scss" scoped>
.page-container { max-width: 900px; }
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.logo-upload {
  display: flex;
  align-items: center;
  gap: 16px;

  .upload-tip {
    font-size: 12px;
    color: var(--text-placeholder);
    margin: 0;
  }
}
.notify-section {
  padding: 20px 10px;
  h4 {
    font-size: 15px;
    color: var(--text-primary);
    margin-bottom: 14px;
  }
  .divider {
    border: none;
    border-top: 1px solid var(--border-color-light);
    margin: 24px 0 18px;
  }
}
.notify-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color-light);

  span {
    font-size: 14px;
    color: var(--text-primary);
  }

  &:last-child {
    border-bottom: none;
  }
}
</style>
