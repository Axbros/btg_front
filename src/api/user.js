import { get, post, put } from './request'

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

/** PUT /api/user/profile（含 walletName、walletAddress 等驼峰字段；tradingAccountPassword 可选） */
export function completeUserProfile(data) {
  return put('/user/profile', data)
}

/**
 * 全部下级树（网关 /api/user/team/descendants → 反代 /api/v1/...）
 * GET /api/user/team/descendants，需登录。
 * 返回 data 为数组：{ id, nickname, status, children[] } 根节点列表，非分页 PageVo。
 */
export function fetchDescendantsTeam() {
  return get('/user/team/descendants')
}

/** POST /api/v1/user/team/{userId}/approve-profile — 直属上级通过资料，下级 status 0→1 */
export function approveTeamMemberProfile(userId) {
  return post(`/user/team/${userId}/approve-profile`, {})
}

/** POST /api/v1/user/team/{userId}/reject-profile — 直属上级退回资料，下级 status 0→-1 */
export function rejectTeamMemberProfile(userId) {
  return post(`/user/team/${userId}/reject-profile`, {})
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

/**
 * Bitget 资产（独立接口，勿与 GET /me 混用）。
 * GET /me/bitget-assets — 返回 ApiResult.data：含 success、message、accounts、totalUsdtBalance、lastSyncTime 等；
 * success === false 时 HTTP 仍可能为 200，请用 data.success / data.message 分支 UI。
 */
export function fetchBitgetAssets() {
  return get('/user/me/bitget-assets?coin=USDT')
}


