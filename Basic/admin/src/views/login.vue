<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <div class="logo-icon">
          <el-icon :size="36"><Van /></el-icon>
        </div>
        <h1 class="logo-title">古月租车</h1>
        <p class="logo-subtitle">商家后台管理系统</p>
      </div>

      <!-- 登录表单 -->
      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="loginRules"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item class="remember-row">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部提示 -->
      <div class="login-footer">
        <p>© 2026 古月租车 · 商家管理平台</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// ---------- 表单数据 ----------
const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(true)

const loginForm = reactive({
  username: '',
  password: '',
})

// ---------- 表单校验规则 ----------
const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度在 6 到 30 个字符', trigger: 'blur' },
  ],
}

// ---------- 登录处理 ----------
async function handleLogin(): Promise<void> {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const success = await userStore.login(loginForm.username, loginForm.password)
      if (success) {
        ElMessage.success('登录成功')

        // 跳转到来源页或首页
        const redirect = (route.query.redirect as string) || '/dashboard'
        router.push(redirect)
      }
    } catch {
      // 错误已在 store / 拦截器中处理
    } finally {
      loading.value = false
    }
  })
}

// ---------- 记住用户名 ----------
onMounted(() => {
  if (rememberMe.value) {
    const savedUsername = localStorage.getItem('admin_remember_user')
    if (savedUsername) {
      loginForm.username = savedUsername
    }
  }
})

function saveUsername(): void {
  if (rememberMe.value && loginForm.username) {
    localStorage.setItem('admin_remember_user', loginForm.username)
  } else {
    localStorage.removeItem('admin_remember_user')
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2744 0%, #1a3a5c 40%, #2c4f6e 70%, #1a3a5c 100%);
  overflow: hidden;
}

// 背景装饰圆圈
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  .circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.06;
    background: #fff;
  }

  .circle-1 {
    width: 600px;
    height: 600px;
    top: -200px;
    right: -150px;
  }

  .circle-2 {
    width: 400px;
    height: 400px;
    bottom: -120px;
    left: -80px;
  }

  .circle-3 {
    width: 250px;
    height: 250px;
    top: 50%;
    left: 15%;
    transform: translateY(-50%);
  }
}

// 登录卡片
.login-card {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 48px 40px 36px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: var(--radius-lg);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.25),
    0 8px 24px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(20px);
}

// Logo 区域
.logo-section {
  text-align: center;
  margin-bottom: 36px;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  border-radius: 18px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.35);
}

.logo-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--biz-blue-dark);
  letter-spacing: 3px;
  margin-bottom: 6px;
}

.logo-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

// 表单样式调整
:deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: 4px 12px;
  box-shadow: 0 0 0 1px var(--border-color-light) inset;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 0 0 1px var(--primary-color-light) inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px var(--primary-color) inset !important;
  }
}

.remember-row {
  margin-bottom: 22px;

  :deep(.el-checkbox__label) {
    color: var(--text-regular);
    font-size: 13px;
  }
}

// 登录按钮
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 6px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  border: none;
  transition: all 0.35s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(24, 144, 255, 0.42);
  }

  &:active {
    transform: translateY(0);
  }
}

// 底部
.login-footer {
  margin-top: 28px;
  text-align: center;

  p {
    font-size: 12px;
    color: var(--text-placeholder);
  }
}
</style>
