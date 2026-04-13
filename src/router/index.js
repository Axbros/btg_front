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
        path: 'account',
        name: 'Account',
        component: () => import('@/views/me/Mt5Snapshot.vue'),
        meta: { title: '账户', tab: 'account', lockViewport: true },
      },
      {
        path: 'team',
        redirect: '/team/descendants',
      },
      {
        path: 'team/direct',
        redirect: '/team/descendants',
      },
      {
        path: 'team/descendants',
        name: 'DescendantsTeam',
        component: () => import('@/views/team/DescendantsTeam.vue'),
        meta: { title: '我的团队', tab: 'team' },
      },
      {
        path: 'team/sub-replenishments',
        name: 'TeamSubReplenishments',
        component: () => import('@/views/team/TeamSubReplenishmentList.vue'),
        meta: { title: '下级补仓记录', tab: 'team', hideTab: true },
      },
      {
        path: 'team/sub-repays',
        name: 'TeamSubRepays',
        component: () => import('@/views/team/TeamSubRepayList.vue'),
        meta: { title: '下级归仓记录', tab: 'team', hideTab: true },
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
        path: 'settlement/row/:rowId',
        name: 'SettlementDetailByRow',
        component: () => import('@/views/settlement/SettlementDetail.vue'),
        meta: { title: '结算详情', hideTab: true },
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
        meta: { title: '更新资料', tab: 'me', hideTab: true },
      },
      {
        path: 'me/account',
        name: 'AccountSummary',
        component: () => import('@/views/me/AccountSummary.vue'),
        meta: { title: '分润汇总', hideTab: true },
      },
      {
        path: 'me/team-stats',
        name: 'TeamStats',
        component: () => import('@/views/me/TeamStats.vue'),
        meta: { title: '团队统计', tab: 'me', hideTab: true },
      },
      {
        path: 'replenishment',
        name: 'ReplenishmentHub',
        component: () => import('@/views/replenishment/ReplenishmentHub.vue'),
        meta: { title: '补仓', tab: 'home', hideTab: true },
      },
      {
        path: 'repay',
        name: 'RepayHub',
        component: () => import('@/views/replenishment/RepayHub.vue'),
        meta: { title: '归仓', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/submit',
        name: 'ReplenishmentSubmit',
        component: () => import('@/views/replenishment/ReplenishmentSubmit.vue'),
        meta: { title: '提交补仓申请', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/mine',
        name: 'ReplenishmentMine',
        component: () => import('@/views/replenishment/ReplenishmentMine.vue'),
        meta: { title: '我的补仓记录', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/mine/:id',
        name: 'ReplenishmentMineDetail',
        component: () => import('@/views/replenishment/ReplenishmentMineDetail.vue'),
        meta: { title: '补仓详情', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/repay',
        name: 'RepayApply',
        component: () => import('@/views/replenishment/RepaySubmit.vue'),
        meta: { title: '提交归仓申请', tab: 'home', hideTab: true },
        alias: 'replenishment/repay-submit',
      },
      {
        path: 'replenishment/repay-mine',
        name: 'RepayMine',
        component: () => import('@/views/replenishment/RepayMine.vue'),
        meta: { title: '我的归仓记录', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/repay/:id',
        name: 'RepayMineDetail',
        component: () => import('@/views/replenishment/RepayMineDetail.vue'),
        meta: { title: '归仓详情', tab: 'home', hideTab: true },
      },
      {
        path: 'admin/pending',
        name: 'AdminPendingProfits',
        component: () => import('@/views/admin/PendingProfits.vue'),
        meta: { title: '待审核收益', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'admin/replenishments/pending',
        name: 'AdminPendingReplenishments',
        component: () => import('@/views/admin/AdminPendingReplenishments.vue'),
        meta: { title: '待审核补仓', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'admin/replenishments/repays/pending',
        name: 'AdminPendingRepays',
        component: () => import('@/views/admin/AdminPendingRepays.vue'),
        meta: { title: '待审核归仓', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'admin/replenishments/repays/:id',
        name: 'AdminRepayDetail',
        component: () => import('@/views/admin/AdminRepayDetail.vue'),
        meta: { title: '归仓详情', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'admin/replenishments/:id',
        name: 'AdminReplenishmentDetail',
        component: () => import('@/views/admin/AdminReplenishmentDetail.vue'),
        meta: { title: '补仓审核详情', requiresAdmin: true, hideTab: true },
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
  document.title = (to.meta.title && `${to.meta.title} - 吞金授`) || '吞金授'

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

  /** status -1 待完善 / 0 待审核：仅允许 /me/profile-complete */
  if (requiresAuth && auth.isLogin && auth.isRestrictedToProfileComplete) {
    if (to.path !== '/me/profile-complete') {
      next({ path: '/me/profile-complete', replace: true })
      return
    }
  }

  next()
})

export default router
