<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '240px'" class="sidebar">
      <!-- Logo 区域 -->
      <div class="sidebar-logo" @click="$router.push('/dashboard')">
        <div class="logo-icon">
          <el-icon :size="22"><Van /></el-icon>
        </div>
        <transition name="fade">
          <span v-show="!isCollapsed" class="logo-text">古月租车</span>
        </transition>
      </div>

      <!-- 导航菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="true"
        router
        background-color="#001529"
        text-color="#rgba(255, 255, 255, 0.65)"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <!-- 数据总览 -->
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据总览</template>
        </el-menu-item>

        <!-- 门店管理 -->
        <el-menu-item index="/store/list">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>门店管理</template>
        </el-menu-item>

        <!-- 员工管理 -->
        <el-menu-item index="/staff/list">
          <el-icon><User /></el-icon>
          <template #title>员工管理</template>
        </el-menu-item>

        <!-- 车辆管理 -->
        <el-menu-item index="/vehicle/list">
          <el-icon><Van /></el-icon>
          <template #title>车辆管理</template>
        </el-menu-item>

        <!-- 订单管理 -->
        <el-menu-item index="/order/list">
          <el-icon><List /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>

        <!-- 财务管理 -->
        <el-sub-menu index="/finance-group">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>财务管理</span>
          </template>
          <el-menu-item index="/finance/revenue">
            <el-icon><TrendCharts /></el-icon>
            收入统计
          </el-menu-item>
          <el-menu-item index="/finance/reconciliation">
            <el-icon><DocumentChecked /></el-icon>
            对账管理
          </el-menu-item>
        </el-sub-menu>

        <!-- 系统设置 -->
        <el-sub-menu index="/settings-group">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/settings">
            <el-icon><Tools /></el-icon>
            基本设置
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 右侧主体区域 -->
    <el-container class="main-container">
      <!-- 顶栏 -->
      <el-header class="header-bar" height="56px">
        <div class="header-left">
          <!-- 折叠按钮 -->
          <el-icon
            class="collapse-btn"
            :size="20"
            @click="toggleCollapse"
          >
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>

          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/" class="breadcrumb-nav">
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="item.path">
              <router-link v-if="index < breadcrumbs.length - 1" :to="item.path">
                {{ item.meta?.title || item.name }}
              </router-link>
              <span v-else>{{ item.meta?.title || item.name }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 全屏切换 -->
          <el-tooltip content="全屏" placement="bottom">
            <el-icon class="header-action-btn" :size="18" @click="toggleFullScreen">
              <FullScreen />
            </el-icon>
          </el-tooltip>

          <!-- 刷新 -->
          <el-tooltip content="刷新页面" placement="bottom">
            <el-icon class="header-action-btn" :size="18" @click="refreshPage">
              <RefreshRight />
            </el-icon>
          </el-tooltip>

          <!-- 用户信息下拉 -->
          <el-dropdown trigger="click" class="user-dropdown">
            <div class="user-info">
              <el-avatar :size="32" :icon="UserFilled" class="user-avatar" />
              <span class="user-name">{{ userStore.nickname }}</span>
              <el-icon class="dropdown-arrow"><ArrowDownBold /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/settings')">
                  <el-icon><UserFilled /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-icon><Key /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="content-main">
        <router-view v-slot="{ Component }">
          <transition name="slide-right" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessageBox,
  ElMessage,
} from 'element-plus'
import {
  UserFilled,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ---------- 侧边栏折叠状态 ----------
const isCollapsed = ref(false)

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value
}

// ---------- 当前激活菜单 ----------
const activeMenu = computed(() => route.path)

// ---------- 面包屑 ----------
interface BreadcrumbItem {
  path: string
  name?: string
  meta?: Record<string, unknown>
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const matched = route.matched.filter(
    (item) => item.meta && item.meta.title
  )

  // 如果第一个不是首页，手动添加
  if (!matched.some((item) => item.path === '/dashboard')) {
    matched.unshift({
      path: '/dashboard',
      meta: { title: '数据总览' },
    })
  }

  return matched as BreadcrumbItem[]
})

// ---------- 全屏功能 ----------
function toggleFullScreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

// ---------- 刷新页面 ----------
function refreshPage(): void {
  router.go(0)
}

// ---------- 退出登录 ----------
async function handleLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    userStore.logout()
    ElMessage.success('已退出登录')
  } catch {
    // 取消操作
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

// ==================== 侧边栏 ====================
.sidebar {
  background-color: #001529;
  overflow-x: hidden;
  overflow-y: auto;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
}

// Logo
.sidebar-logo {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    min-width: 36px;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
    border-radius: 10px;
    color: #fff;
  }

  .logo-text {
    margin-left: 12px;
    font-size: 17px;
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    letter-spacing: 2px;
  }
}

// 菜单样式覆盖
.sidebar-menu {
  border-right: none;
  padding-top: 8px;

  &:not(.el-menu--collapse) {
    width: 240px;
  }

  .el-menu-item,
  .el-sub-menu__title {
    height: 48px;
    line-height: 48px;
    margin: 2px 10px;
    border-radius: var(--radius-md);

    .el-icon {
      font-size: 17px;
      width: 17px;
      margin-right: 8px;
    }
  }

  .el-menu-item.is-active {
    background: linear-gradient(90deg, var(--primary-color), var(--primary-color-light)) !important;
    color: #fff !important;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.32);

    .el-icon {
      color: #fff;
    }
  }

  .el-menu-item:hover:not(.is-active),
  .el-sub-menu__title:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
    color: #fff !important;
  }

  // 子菜单
  .el-menu--inline {
    .el-menu-item {
      height: 42px;
      line-height: 42px;
      min-width: auto !important;
      padding-left: 52px !important;
      margin: 2px 10px;

      .el-icon {
        font-size: 14px;
        margin-right: 6px;
      }
    }
  }

  // 折叠态菜单
  &.el-menu--collapse {
    .el-menu-item,
    .el-sub-menu__title {
      margin: 6px auto;
      justify-content: center;
      padding: 0 !important;
    }
  }
}

// ==================== 主容器 ====================
.main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-page);
}

// ==================== 顶栏 ====================
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--border-color-light);
  box-shadow: var(--shadow-sm);
  padding: 0 20px;
  z-index: 999;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.collapse-btn {
  cursor: pointer;
  color: var(--text-regular);
  transition: color 0.25s;
  padding: 4px;
  border-radius: var(--radius-sm);

  &:hover {
    color: var(--primary-color);
    background-color: rgba(24, 144, 255, 0.06);
  }
}

.breadcrumb-nav {
  font-size: 14px;

  :deep(.el-breadcrumb__inner) {
    color: var(--text-secondary);

    a:hover {
      color: var(--primary-color);
    }
  }

  :deep(.el-breadcrumb__inner.is-link) {
    color: var(--text-secondary);
    font-weight: normal;
  }

  :deep(.el-breadcrumb__separator) {
    color: var(--text-placeholder);
    margin: 0 6px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  cursor: pointer;
  color: var(--text-regular);
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: all 0.25s;

  &:hover {
    color: var(--primary-color);
    background-color: rgba(24, 144, 255, 0.06);
  }
}

// 用户下拉
.user-dropdown {
  margin-left: 8px;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  transition: background-color 0.25s;

  &:hover {
    background-color: var(--bg-page);
  }

  .user-avatar {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
    color: #fff;
    font-size: 13px;
  }

  .user-name {
    font-size: 14px;
    color: var(--text-primary);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    color: var(--text-placeholder);
    font-size: 12px;
  }
}

// ==================== 内容区 ====================
.content-main {
  background-color: var(--bg-page);
  overflow-y: auto;
  padding: 20px;
  position: relative;
}
</style>
