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
        meta: { title: '直属下级', tab: 'team' },
      },
      {
        path: 'team/descendants',
        name: 'DescendantsTeam',
        component: () => import('@/views/team/DescendantsTeam.vue'),
        meta: { title: '全部下级', tab: 'team' },
      },
      {
        path: 'team/member/:memberId',
        name: 'TeamMemberDetail',
        component: () => import('@/views/team/TeamMemberDetail.vue'),
        meta: { title: '下级详情', tab: 'team', hideTab: true },
      },
      {
        path: 'team/bind/:childUserId',
        name: 'BindStrategy',
        component: () => import('@/views/team/BindStrategy.vue'),
        meta: { title: '绑定策略', tab: 'team', hideTab: true },
      },
      {
        path: 'strategies',
        name: 'Strategies',
        component: () => import('@/views/team/StrategyList.vue'),
        meta: { title: '分佣策略', tab: 'team', hideTab: true },
      },
      {
        path: 'profit/submit',
        name: 'SubmitProfit',
        component: () => import('@/views/profit/SubmitProfit.vue'),
        meta: { title: '收益申报', tab: 'profit' },
      },
      {
        path: 'profit/list',
        name: 'ProfitList',
        component: () => import('@/views/profit/ProfitList.vue'),
        meta: { title: '我的收益', tab: 'profit', hideTab: true },
      },
      {
        path: 'profit/referrer/records',
        name: 'ReferrerProfitList',
        component: () => import('@/views/profit/ReferrerProfitList.vue'),
        meta: { title: '下级申报审核', tab: 'profit', hideTab: true },
      },
      {
        path: 'profit/referrer/records/:id',
        name: 'ReferrerProfitDetail',
        component: () => import('@/views/profit/ReferrerProfitDetail.vue'),
        meta: { title: '申报详情', tab: 'profit', hideTab: true },
      },
      {
        path: 'commission/list/:id',
        name: 'CommissionDetail',
        component: () => import('@/views/commission/CommissionDetail.vue'),
        meta: { title: '佣金详情', tab: 'me', hideTab: true },
      },
      {
        path: 'commission/list',
        name: 'CommissionList',
        component: () => import('@/views/commission/CommissionList.vue'),
        meta: { title: '佣金流水', tab: 'me', hideTab: true },
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
      {
        path: 'admin/pending',
        name: 'PendingProfits',
        component: () => import('@/views/admin/PendingProfits.vue'),
        meta: { title: '待审核收益', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'admin/strategies',
        name: 'StrategyManage',
        component: () => import('@/views/admin/StrategyManage.vue'),
        meta: { title: '策略管理', requiresAdmin: true, hideTab: true },
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
  document.title = (to.meta.title && `${to.meta.title} - 推荐分佣`) || '推荐分佣'

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
