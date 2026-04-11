import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isUserAdmin } from '@/utils/permission'
import MainLayout from '@/layout/MainLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/home' },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/Home.vue'),
        meta: { title: '工作台', tab: 'home' },
      },
      {
        path: 'team',
        redirect: '/team/direct',
      },
      {
        path: 'team/direct',
        name: 'DirectTeam',
        component: () => import('@/views/team/DirectTeam.vue'),
        meta: { title: '我的直属下级', tab: 'team' },
      },
      {
        path: 'team/descendants',
        name: 'DescendantsTeam',
        component: () => import('@/views/team/DescendantsTeam.vue'),
        meta: { title: '我的全部下级', tab: 'team' },
      },
      {
        path: 'team/member/:memberId/profit-ratio',
        name: 'ChildProfitRatioEdit',
        component: () => import('@/views/team/ChildProfitRatioEdit.vue'),
        meta: { title: '调整子级利润比例', tab: 'team', hideTab: true },
      },
      {
        path: 'team/member/:memberId',
        name: 'TeamMemberDetail',
        component: () => import('@/views/team/TeamMemberDetail.vue'),
        meta: { title: '下级详情', tab: 'team', hideTab: true },
      },
      {
        path: 'profit-report/submit',
        name: 'ProfitReportSubmit',
        component: () => import('@/views/profitReport/ProfitReportSubmit.vue'),
        meta: { title: '利润上报', tab: 'report' },
      },
      {
        path: 'profit-report/mine',
        name: 'ProfitReportList',
        component: () => import('@/views/profitReport/ProfitReportList.vue'),
        meta: { title: '我的利润上报记录', tab: 'report', hideTab: true },
      },
      {
        path: 'profit-report/:profitReportId/distribution',
        name: 'ProfitDistributionDetail',
        component: () => import('@/views/profitReport/ProfitDistributionDetail.vue'),
        meta: { title: '分润明细', tab: 'report', hideTab: true },
      },
      {
        path: 'settlement/pending-pay',
        name: 'PendingPaySettlements',
        component: () => import('@/views/settlement/PendingPayList.vue'),
        meta: { title: '待支付给上级', hideTab: true },
      },
      {
        path: 'settlement/pending-review',
        name: 'PendingReviewSettlements',
        component: () => import('@/views/settlement/PendingReviewList.vue'),
        meta: { title: '待审核下级结算', hideTab: true },
      },
      {
        path: 'settlement/:id',
        name: 'SettlementDetail',
        component: () => import('@/views/settlement/SettlementDetail.vue'),
        meta: { title: '结算详情', hideTab: true },
      },
      {
        path: 'me/profile',
        name: 'Profile',
        component: () => import('@/views/me/Profile.vue'),
        meta: { title: '我的信息', tab: 'me' },
      },
      {
        path: 'me/profile-complete',
        name: 'ProfileComplete',
        component: () => import('@/views/me/ProfileComplete.vue'),
        meta: { title: '完善资料', tab: 'me', hideTab: true },
      },
      {
        path: 'me/account',
        name: 'AccountSummary',
        component: () => import('@/views/me/AccountSummary.vue'),
        meta: { title: '账户汇总', tab: 'me', hideTab: true },
      },
      {
        path: 'me/team-stats',
        name: 'TeamStats',
        component: () => import('@/views/me/TeamStats.vue'),
        meta: { title: '团队统计', tab: 'me', hideTab: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/common/NotFound.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  document.title = (to.meta.title && `${to.meta.title} - 金砖分润`) || '金砖分润'

  const isPublic = to.matched.some((r) => r.meta.public)
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)

  if (isPublic) {
    next()
    return
  }

  if (requiresAuth && !auth.isLogin) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (requiresAdmin && !isUserAdmin(auth.userInfo)) {
    next({ path: '/home' })
    return
  }

  next()
})

export default router
