import { get, put } from './request'

/** GET /api/v1/me — UserMeVo（含直属团队长展示名 referrerNickname） */
export function fetchMe() {
  return get('/me')
}

/**
 * GET /api/user/{id}，需登录（查看下级详情等场景）
 * UserDetailVo：user、profile；分润相关常见字段：childProfitRatio（用户利润比例）等
 */
export function fetchUserDetail(id) {
  return get(`/user/${id}`)
}

/** PUT /api/user/profile（含 walletName、walletAddress 等驼峰字段；tradingAccountPassword 可选） */
export function completeUserProfile(data) {
  return put('/user/profile', data)
}

/**
 * 团队树 + 统计（单接口）
 * GET /api/v1/user/team/descendants
 * 响应 data 建议结构：{ directCount, allDescendantCount, records: { descendants: Node[] } }；亦兼容根数组等旧形。
 * Node：{ id, nickname, status, children[] }。
 */
export function fetchDescendantsTeam() {
  return get('/user/team/descendants')
}

export function fetchAccountSummary() {
  return get('/me/account-summary')
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

