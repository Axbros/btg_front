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

export function fetchAccountSummary() {
  return get('/me/account-summary')
}

export function fetchTeamStats() {
  return get('/me/team-stats')
}

export function fetchUserProfile() {
  return get('/user/profile')
}

/** 新成员资格审核（实现见 {@link ./userQualification.js}） */
export {
  approveQualification,
  getPendingQualificationUsers,
  rejectQualification,
  resubmitQualification,
} from './userQualification'

