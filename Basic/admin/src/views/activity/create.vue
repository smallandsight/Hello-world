<template>
  <div class="activity-create-container">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">{{ isEdit ? '编辑活动' : '新建活动' }}</span>
      </template>
    </el-page-header>

    <el-card shadow="hover" class="form-card">
      <el-form
        ref="formRef"
        :model="activityForm"
        :rules="formRules"
        label-width="120px"
        label-position="right"
      >
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>

        <el-form-item label="活动名称" prop="name">
          <el-input v-model="activityForm.name" placeholder="请输入活动名称" maxlength="50" show-word-limit style="width: 400px;" />
        </el-form-item>

        <el-form-item label="活动类型" prop="type">
          <el-radio-group v-model="activityForm.type">
            <el-radio value="flash_sale">限时特价</el-radio>
            <el-radio value="discount">满减活动</el-radio>
            <el-radio value="new_user">新人专享</el-radio>
            <el-radio value="member_only">会员专享</el-radio>
            <el-radio value="invitation">邀请有礼</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="活动时间" prop="dateRange">
          <el-date-picker
            v-model="activityForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 400px;"
          />
        </el-form-item>

        <el-form-item label="活动封面" prop="coverImage">
          <el-upload
            class="cover-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
            @change="handleCoverChange"
          >
            <img v-if="activityForm.coverImage" :src="activityForm.coverImage" class="cover-preview" />
            <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
            <div class="upload-tip">建议尺寸 750x350</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="活动描述" prop="description">
          <el-input
            v-model="activityForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入活动描述"
            maxlength="200"
            show-word-limit
            style="width: 400px;"
          />
        </el-form-item>

        <!-- 活动规则 -->
        <el-divider content-position="left">活动规则</el-divider>

        <!-- 限时特价 -->
        <template v-if="activityForm.type === 'flash_sale'">
          <el-form-item label="适用车型" prop="vehicleModels">
            <el-select v-model="activityForm.vehicleModels" multiple placeholder="选择适用车型" style="width: 400px;">
              <el-option label="小牛NQi Pro" value="niu_nqi_pro" />
              <el-option label="雅迪DE3" value="yadea_de3" />
              <el-option label="九号C90" value="ninebot_c90" />
              <el-option label="小牛MQi2" value="niu_mqi2" />
            </el-select>
          </el-form-item>

          <el-form-item label="折扣方式" prop="discountType">
            <el-radio-group v-model="activityForm.discountType">
              <el-radio value="percent">折扣</el-radio>
              <el-radio value="fixed">立减</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="折扣值" prop="discountValue">
            <el-input-number
              v-model="activityForm.discountValue"
              :min="activityForm.discountType === 'percent' ? 1 : 1"
              :max="activityForm.discountType === 'percent' ? 99 : 500"
              :precision="activityForm.discountType === 'percent' ? 0 : 2"
              style="width: 200px;"
            />
            <span class="input-suffix">{{ activityForm.discountType === 'percent' ? '折' : '元' }}</span>
          </el-form-item>

          <el-form-item label="限量设置" prop="quota">
            <el-input-number v-model="activityForm.quota" :min="0" placeholder="0表示不限量" style="width: 200px;" />
            <span class="input-suffix">单（总参与次数）</span>
          </el-form-item>
        </template>

        <!-- 满减活动 -->
        <template v-if="activityForm.type === 'discount'">
          <el-form-item label="满减规则" prop="discountRules">
            <div class="discount-rules">
              <div class="rule-item" v-for="(rule, index) in activityForm.discountRules" :key="index">
                <span class="rule-label">满</span>
                <el-input-number v-model="rule.minAmount" :min="0" :precision="0" size="small" style="width: 100px;" />
                <span class="rule-label">减</span>
                <el-input-number v-model="rule.discountAmount" :min="0" :precision="0" size="small" style="width: 100px;" />
                <span class="rule-label">元</span>
                <el-button
                  v-if="activityForm.discountRules.length > 1"
                  type="danger"
                  link
                  size="small"
                  @click="removeDiscountRule(index)"
                >
                  删除
                </el-button>
              </div>
              <el-button type="primary" link size="small" @click="addDiscountRule">+ 添加规则</el-button>
            </div>
          </el-form-item>

          <el-form-item label="最大优惠" prop="maxDiscount">
            <el-input-number v-model="activityForm.maxDiscount" :min="0" :precision="0" style="width: 200px;" />
            <span class="input-suffix">元（0表示不限制）</span>
          </el-form-item>
        </template>

        <!-- 邀请有礼 -->
        <template v-if="activityForm.type === 'invitation'">
          <el-form-item label="邀请人奖励" prop="inviterReward">
            <el-input-number v-model="activityForm.inviterReward" :min="0" :precision="0" style="width: 200px;" />
            <span class="input-suffix">积分/人</span>
          </el-form-item>

          <el-form-item label="被邀请人奖励" prop="inviteeReward">
            <el-input-number v-model="activityForm.inviteeReward" :min="0" :precision="0" style="width: 200px;" />
            <span class="input-suffix">积分</span>
          </el-form-item>

          <el-form-item label="每人限邀请" prop="maxInvites">
            <el-input-number v-model="activityForm.maxInvites" :min="0" style="width: 200px;" />
            <span class="input-suffix">人（0表示不限制）</span>
          </el-form-item>
        </template>

        <!-- 参与限制 -->
        <el-divider content-position="left">参与限制</el-divider>

        <el-form-item label="参与限制" prop="participantLimit">
          <el-checkbox-group v-model="activityForm.participantLimit">
            <el-checkbox value="new_user">仅限新用户</el-checkbox>
            <el-checkbox value="verified">需完成实名认证</el-checkbox>
            <el-checkbox value="member">仅限会员</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="每人限参与" prop="userLimit">
          <el-input-number v-model="activityForm.userLimit" :min="1" :max="99" style="width: 200px;" />
          <span class="input-suffix">次</span>
        </el-form-item>

        <el-form-item label="适用门店" prop="stores">
          <el-select v-model="activityForm.stores" multiple placeholder="全部门店" clearable style="width: 400px;">
            <el-option label="朝阳店" value="S001" />
            <el-option label="海淀店" value="S002" />
            <el-option label="西城店" value="S003" />
            <el-option label="东城店" value="S004" />
          </el-select>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button type="primary" size="large" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存修改' : '创建活动' }}
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
          <el-button v-if="!isEdit" size="large" @click="handleSaveDraft">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'

const isEdit = computed(() => false) // 根据 route 判断是否编辑模式
const formRef = ref<FormInstance>()
const submitting = ref(false)

// ---------- 表单数据 ----------
const activityForm = reactive({
  name: '',
  type: 'flash_sale',
  dateRange: [] as string[],
  coverImage: '',
  description: '',
  vehicleModels: [] as string[],
  discountType: 'percent',
  discountValue: 8,
  quota: 1000,
  discountRules: [
    { minAmount: 100, discountAmount: 15 },
    { minAmount: 200, discountAmount: 35 },
  ],
  maxDiscount: 0,
  inviterReward: 50,
  inviteeReward: 30,
  maxInvites: 0,
  participantLimit: [] as string[],
  userLimit: 1,
  stores: [] as string[],
})

// ---------- 表单验证 ----------
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入活动名称', trigger: 'blur' },
    { min: 2, max: 50, message: '活动名称长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择活动类型', trigger: 'change' },
  ],
  dateRange: [
    { required: true, message: '请选择活动时间', trigger: 'change' },
  ],
}

// ---------- 方法 ----------
function handleCoverChange(file: UploadFile): void {
  if (file.raw) {
    activityForm.coverImage = URL.createObjectURL(file.raw)
  }
}

function addDiscountRule(): void {
  activityForm.discountRules.push({ minAmount: 300, discountAmount: 50 })
}

function removeDiscountRule(index: number): void {
  activityForm.discountRules.splice(index, 1)
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true
      setTimeout(() => {
        submitting.value = false
        console.log('提交表单:', activityForm)
      }, 1500)
    }
  })
}

function handleSaveDraft(): void {
  console.log('保存草稿:', activityForm)
}
</script>

<style lang="scss" scoped>
.activity-create-container {
  max-width: 900px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.form-card {
  margin-top: 20px;
}

// ========== 封面上传 ==========
.cover-uploader {
  :deep(.el-upload) {
    position: relative;
    width: 200px;
    height: 100px;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--primary-color);
    }
  }
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-uploader-icon {
  font-size: 28px;
  color: var(--text-placeholder);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
}

.upload-tip {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
}

// ========== 折扣规则 ==========
.discount-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.input-suffix {
  margin-left: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>