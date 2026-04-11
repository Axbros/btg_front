import { get, put } from './request'

/** GET /api/v1/me — UserMeVo（含直属上级展示名 referrerNickname） */
export function fetchMe() {
  return get('/me')
}

/**
 * GET /api/user/{id}，需登录（查看下级详情等场景）
 * UserDetailVo：user、profile；分润相关常见字段：childProfitRatio（子级利润比例）等
 */
export function fetchUserDetail(id) {
  return get(`/user/${id}`)
}

/** PUT /api/user/profile — ProfileCompleteRequest */
export function completeUserProfile(data) {
  return put('/user/profile', data)
}

/**
 * 直属下级（referrer_user_id = 当前用户）
 * GET /api/user/team/direct，需登录。Query：page、pageSize。
 */
export function fetchDirectTeam(params = {}) {
  return get('/user/team/direct', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
}

/**
 * 全部下级多级
 * GET /api/user/team/descendants，需登录。Query：page、pageSize。
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

export function fetchUserProfile() {
  return get('/user/profile')
}
