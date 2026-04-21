import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isUserAdmin, isUserRoot } from '@/utils/permission'
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
        meta: { title: '工作台', tab: 'home', lockViewport: true },
      },
      {
        path: 'todo',
        name: 'TodoHub',
        component: () => import('@/views/todo/TodoHub.vue'),
        meta: { title: '待办', tab: 'todo', lockViewport: true },
      },
      {
        path: 'me/mt5',
        name: 'Mt5Snapshot',
        component: () => import('@/views/me/Mt5Snapshot.vue'),
        meta: { title: '账户快照', tab: 'home', hideTab: false, lockViewport: true },
      },
      // {
      //   path: 'team',
      //   redirect: '/team/descendants',
      // },
      // {
      //   path: 'team/direct',
      //   redirect: '/team/descendants',
      // },
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
        meta: { title: '调整用户利润比例', tab: 'team', hideTab: true },
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
        meta: { title: '利润上报', tab: 'report', lockViewport: true },
      },
      {
        path: 'profit-report/mine',
        name: 'ProfitReportList',
        component: () => import('@/views/profitReport/ProfitReportList.vue'),
        meta: { title: '利润记录', tab: 'report', hideTab: true, lockViewport: true },
      },
      {
        path: 'profit-report/:profitReportId/resubmit',
        name: 'ProfitReportResubmit',
        component: () => import('@/views/profitReport/ProfitReportResubmit.vue'),
        meta: { title: '利润·重新提交', tab: 'report', hideTab: true, lockViewport: true },
      },
      {
        path: 'profit-report/:profitReportId/flow',
        name: 'ProfitReportFlow',
        component: () => import('@/views/flow/BusinessFlowDetail.vue'),
        meta: { title: '利润·流转详情', tab: 'report', hideTab: true, flowKind: 'profit' },
      },
      {
        path: 'profit-report/:profitReportId/distribution',
        name: 'ProfitDistributionDetail',
        component: () => import('@/views/profitReport/ProfitDistributionDetail.vue'),
        meta: { title: '分润明细', tab: 'report', hideTab: true, lockViewport: true },
      },
      {
        path: 'flow/profit/:rootReportId',
        name: 'ProfitFlowDetail',
        component: () => import('@/views/flow/ProfitFlowDetail.vue'),
        meta: { title: '利润分润链路', hideTab: true },
      },
      {
        path: 'settlement/pending-pay',
        name: 'PendingPaySettlements',
        component: () => import('@/views/settlement/PendingPayList.vue'),
        meta: { title: '待支付给团队长', hideTab: true },
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
        path: 'me/profile/account',
        name: 'ProfileAccount',
        component: () => import('@/views/me/ProfileAccount.vue'),
        meta: { title: '账户与身份', tab: 'me', hideTab: true },
      },
      {
        path: 'me/profile/invite',
        name: 'ProfileInvite',
        component: () => import('@/views/me/ProfileInvite.vue'),
        meta: { title: '邀请注册', tab: 'me', hideTab: true },
      },
      {
        path: 'me/profile/qualification',
        name: 'ProfileQualification',
        component: () => import('@/views/me/ProfileQualification.vue'),
        meta: { title: '资格审核', tab: 'me', hideTab: true },
      },
      {
        path: 'me/profile/materials',
        name: 'ProfileMaterials',
        component: () => import('@/views/me/ProfileMaterials.vue'),
        meta: { title: '交易资料', tab: 'me', hideTab: true },
      },
      {
        path: 'me/profile-complete',
        name: 'ProfileComplete',
        component: () => import('@/views/me/ProfileComplete.vue'),
        meta: { title: '更新资料', tab: 'me', hideTab: true },
      },
      {
        path: 'qualification/pending',
        name: 'QualificationPending',
        component: () => import('@/views/user/QualificationPending.vue'),
        meta: { requiresAuth: true, title: '等待审核', tab: 'me', hideTab: true },
      },
      { path: 'user/qualification-pending', redirect: '/qualification/pending' },
      {
        path: 'me/account',
        name: 'AccountSummary',
        component: () => import('@/views/me/AccountSummary.vue'),
        meta: { title: '分润汇总', hideTab: true },
      },
      {
        path: 'me/team-stats',
        redirect: '/team/descendants',
      },
      {
        path: 'replenishment',
        redirect: { name: 'ReplenishmentMine' },
      },
      {
        path: 'repay',
        name: 'RepayHub',
        redirect: { name: 'RepayMine' },
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
        meta: { title: '补仓', tab: 'home', hideTab: true },
      },
      /** 旧链接 /mine/1～5 与「仅一位数字」筛选态：重定向到 query.uv，避免与详情 id 冲突 */
      {
        path: 'replenishment/mine/:uvOnly(1|2|3|4|5)',
        redirect: (to) => ({
          name: 'ReplenishmentMine',
          query: { ...to.query, uv: String(to.params.uvOnly) },
        }),
      },
      {
        path: 'replenishment/mine/:id/resubmit',
        name: 'ReplenishmentResubmit',
        component: () => import('@/views/replenishment/ReplenishmentResubmit.vue'),
        meta: { title: '补仓·重新提交', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/mine/:id/flow',
        name: 'ReplenishmentFlow',
        component: () => import('@/views/flow/BusinessFlowDetail.vue'),
        meta: { title: '补仓·状态流', tab: 'home', hideTab: true, flowKind: 'replenishment' },
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
        component: () => import('@/views/replenishment/RepayApply.vue'),
        meta: { title: '提交归仓申请', tab: 'home', hideTab: true },
        alias: 'replenishment/repay-submit',
      },
      {
        path: 'replenishment/repay-mine',
        name: 'RepayMine',
        component: () => import('@/views/replenishment/MyRepayList.vue'),
        meta: { title: '归仓', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/repay/:id/resubmit',
        name: 'RepayResubmit',
        component: () => import('@/views/replenishment/RepayResubmit.vue'),
        meta: { title: '归仓·重新提交', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/repay/:id/flow',
        redirect: (to) => ({ name: 'RepayFlowDetail', params: { id: String(to.params.id) } }),
      },
      {
        path: 'replenishment/repays/pending-review',
        name: 'RepayPendingReview',
        component: () => import('@/views/replenishment/RepayPendingReview.vue'),
        meta: { title: '待审归仓申请', tab: 'home', hideTab: true },
      },
      {
        path: 'replenishment/repays/:id/flow',
        name: 'RepayFlowDetail',
        component: () => import('@/views/replenishment/RepayFlowDetail.vue'),
        meta: { title: '归仓状态流', tab: 'home', hideTab: true },
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
        path: 'admin/users/pending-qualification',
        name: 'AdminUserQualificationPending',
        component: () => import('@/views/admin/UserQualificationPending.vue'),
        meta: { title: '待审核资格', requiresRoot: true, hideTab: true },
      },
      {
        path: 'admin/profit-report-window',
        name: 'AdminProfitReportWindowToday',
        component: () => import('@/views/admin/ProfitReportWindowToday.vue'),
        meta: { title: '今日结算', requiresRoot: true, hideTab: true },
      },
      {
        path: 'admin/replenishments/pending',
        name: 'AdminPendingReplenishments',
        component: () => import('@/views/replenishment/AdminReplenishmentPending.vue'),
        meta: { title: '补仓审核', requiresAdmin: true, hideTab: true },
      },
      {
        path: 'replenishment/admin/pending',
        redirect: { name: 'AdminPendingReplenishments' },
      },
      {
        path: 'replenishment/assigned',
        name: 'AssignedReplenishmentList',
        component: () => import('@/views/replenishment/AssignedReplenishmentList.vue'),
        meta: { title: '资方补仓', hideTab: true },
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

  const requiresRoot = to.matched.some((r) => r.meta.requiresRoot)
  if (requiresRoot && !isUserRoot(auth.userInfo)) {
    next({ path: '/home' })
    return
  }

  /** status -1 待完善：仅允许资料编辑页 */
  if (requiresAuth && auth.isLogin && auth.isProfileOnlyLocked) {
    if (to.path !== '/me/profile-complete') {
      next({ path: '/me/profile-complete', replace: true })
      return
    }
  }

  /** status 0 资料待审核：等待审核页 + 资料编辑页 */
  if (requiresAuth && auth.isLogin && auth.isProfilePendingReview) {
    const allowed = new Set(['/qualification/pending', '/me/profile-complete', '/user/qualification-pending'])
    if (!allowed.has(to.path)) {
      next({ path: '/qualification/pending', replace: true })
      return
    }
  }

  /**
   * 资格 PENDING / REJECTED：禁止进入其它业务页，仅允许等待页、资料编辑、我的信息（只读）
   * （-1 待完善仍由上方规则独占 profile-complete）
   */
  if (requiresAuth && auth.isLogin && auth.isQualificationPendingOrRejected && !auth.isProfileOnlyLocked) {
    const path = to.path
    const allowedProfile =
      path === '/me/profile' || path.startsWith('/me/profile/')
    const allowed =
      allowedProfile ||
      path === '/qualification/pending' ||
      path === '/me/profile-complete' ||
      path === '/user/qualification-pending'
    if (!allowed) {
      next({ path: '/qualification/pending', replace: true })
      return
    }
  }

  next()
})

export default router
