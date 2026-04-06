import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 布局组件 - 动态导入
const Layout = () => import('@/views/layout/index.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据总览', icon: 'DataAnalysis' },
      },
      {
        path: 'store/list',
        name: 'StoreList',
        component: () => import('@/views/store/list.vue'),
        meta: { title: '门店管理', icon: 'OfficeBuilding' },
      },
      {
        path: 'staff/list',
        name: 'StaffList',
        component: () => import('@/views/staff/list.vue'),
        meta: { title: '员工管理', icon: 'User' },
      },
      {
        path: 'vehicle/list',
        name: 'VehicleList',
        component: () => import('@/views/vehicle/list.vue'),
        meta: { title: '车辆管理', icon: 'Van' },
      },
      {
        path: 'order/list',
        name: 'OrderList',
        component: () => import('@/views/order/list.vue'),
        meta: { title: '订单管理', icon: 'List' },
      },
      {
        path: 'finance/revenue',
        name: 'FinanceRevenue',
        component: () => import('@/views/finance/revenue.vue'),
        meta: { title: '收入统计', icon: 'Money' },
      },
      {
        path: 'finance/reconciliation',
        name: 'FinanceReconciliation',
        component: () => import('@/views/finance/reconciliation.vue'),
        meta: { title: '对账管理', icon: 'DocumentChecked' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
      // ===== 第四阶段新增页面 =====
      {
        path: 'analytics/user',
        name: 'AnalyticsUser',
        component: () => import('@/views/analytics/user.vue'),
        meta: { title: '用户分析', icon: 'User' },
      },
      {
        path: 'analytics/order',
        name: 'AnalyticsOrder',
        component: () => import('@/views/analytics/order.vue'),
        meta: { title: '订单分析', icon: 'Document' },
      },
      {
        path: 'analytics/vehicle',
        name: 'AnalyticsVehicle',
        component: () => import('@/views/analytics/vehicle.vue'),
        meta: { title: '车辆分析', icon: 'Van' },
      },
      {
        path: 'analytics/revenue',
        name: 'AnalyticsRevenue',
        component: () => import('@/views/analytics/revenue.vue'),
        meta: { title: '收入分析', icon: 'Money' },
      },
      {
        path: 'report/list',
        name: 'ReportList',
        component: () => import('@/views/report/list.vue'),
        meta: { title: '报表中心', icon: 'DataAnalysis' },
      },
      {
        path: 'activity/list',
        name: 'ActivityList',
        component: () => import('@/views/activity/list.vue'),
        meta: { title: '活动管理', icon: 'Present' },
      },
      {
        path: 'activity/create',
        name: 'ActivityCreate',
        component: () => import('@/views/activity/create.vue'),
        meta: { title: '创建活动', icon: 'Plus' },
      },
      {
        path: 'exception/list',
        name: 'ExceptionList',
        component: () => import('@/views/exception/list.vue'),
        meta: { title: '异常处理', icon: 'Warning' },
      },
      {
        path: 'tools/batch',
        name: 'ToolsBatch',
        component: () => import('@/views/tools/batch.vue'),
        meta: { title: '批量工具', icon: 'Operation' },
      },
      {
        path: 'tools/template',
        name: 'ToolsTemplate',
        component: () => import('@/views/tools/template.vue'),
        meta: { title: '消息模板', icon: 'Message' },
      },
    ],
  },
  {
    // 404 兜底
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 路由守卫 - 登录验证
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '页面'} - 古月租车商家台`

  const userStore = useUserStore()
  const isAuthenticated = !!userStore.token

  if (to.meta.requiresAuth !== false && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
