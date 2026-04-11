import { get, put } from './request'

/** GET /api/user/me — UserMeVo（含 referrerNickname、kycStatus：0 未提交 1 待审 2 通过 3 拒绝） */
export function fetchMe() {
  return get('/user/me')
}

/**
 * GET /api/user/{id}，需登录（查看下级详情等场景）
 * UserDetailVo：user（同 me：含 referrerNickname）、profile；根级另有 strategyId、strategyName、commissionRate 等
 */
export function fetchUserDetail(id) {
  return get(`/user/${id}`)
}

/** PUT /api/user/profile — ProfileCompleteRequest */
export function completeUserProfile(data) {
  return put('/user/profile', data)
}

/**
 * 直属下级（UserService.listDirectChildren：referrer_user_id = 当前用户）
 * GET /api/user/team/direct，需登录。Query：page、pageSize。
 * data 为分页对象时需含 total（或 totalElements）及 records/list/content 之一。
 * SysUserSimpleVo：id、mobile、kycStatus（0 未提交 1 待审核 2 通过 3 拒绝）等
 */
export function fetchDirectTeam(params = {}) {
  return get('/user/team/direct', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
}

/**
 * 全部下级多级（UserService.listAllDescendants：ancestor_path LIKE 当前用户路径前缀）
 * GET /api/user/team/descendants，需登录。Query：page、pageSize；返回含 total 等同 {@link fetchDirectTeam}。
 */
export function fetchDescendantsTeam(params = {}) {
  return get('/user/team/descendants', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
}

export function fetchAccountSummary() {
  return get('/me/account-summary')
}

export function fetchTeamStats() {
  return get('/me/team-stats')
}

/**
 * GET /api/me/commission-strategy — 当前用户适用分佣策略（与申报接口同一套规则）
 * MyActiveCommissionStrategyVo：strategyId、strategyName、strategyCode、commissionRate、transferRatio 等；无推荐人/未绑定等 → 409
 */
export function fetchMyActiveCommissionStrategy() {
  return get('/me/commission-strategy')
}
