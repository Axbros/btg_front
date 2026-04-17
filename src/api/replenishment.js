import { get, post } from './request'

/** POST /api/v1/replenishments */
export function submitReplenishment(data) {
  return post('/replenishments', data)
}

/**
 * 我的补仓分页（列表项仅 id、applyNo 等简要字段）。
 * GET /api/v1/replenishments/mine
 */
export function fetchReplenishmentMine(params = {}) {
  return get('/replenishments/mine', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/**
 * 补仓详情（聚合）。
 * GET /api/v1/replenishments/{id}
 * data: { replenishment: ReplenishmentVO, approvedRepays: RepayBrief[] }
 */
export function fetchReplenishmentMineDetail(id) {
  return get(`/replenishments/${id}`)
}

/** GET /api/v1/replenishments/current */
export function fetchReplenishmentCurrent() {
  return get('/replenishments/current')
}

/**
 * 查询可归仓补仓单（资方执行人 / 收款 UID 等由后端带出）。
 * GET /api/v1/replenishments/repayable
 */
export function getRepayableReplenishments() {
  return get('/replenishments/repayable')
}

/**
 * 提交归仓申请。
 * POST /api/v1/replenishments/repays
 * @param {{ replenishApplyId: number, repayAmount: number, repayScreenshotUrl: string }} data
 */
export function submitRepayApply(data) {
  return post('/replenishments/repays', data)
}

/** @deprecated 与 submitRepayApply 相同 */
export const submitRepay = submitRepayApply

/**
 * 我的归仓申请分页。
 * GET /api/v1/replenishments/repays/mine
 */
export function getMyRepayApplyList(params = {}) {
  const { page, size, pageSize, ...rest } = params
  return get('/replenishments/repays/mine', {
    page: page ?? 1,
    size: size ?? pageSize ?? 10,
    ...rest,
  })
}

/** 兼容旧名 */
export function fetchRepayMine(params = {}) {
  return getMyRepayApplyList(params)
}

/**
 * 归仓详情。
 * GET /api/v1/replenishments/repays/{id}
 */
export function getRepayDetail(id) {
  return get(`/replenishments/repays/${id}`)
}

/** 兼容旧名 */
export function fetchRepayMineDetail(id) {
  return getRepayDetail(id)
}

/**
 * 归仓重提。
 * POST /api/v1/replenishments/repays/{id}/resubmit
 */
export function resubmitRepayApply(id, data) {
  return post(`/replenishments/repays/${id}/resubmit`, data)
}

/**
 * 待我审核的归仓申请（资方执行人）。
 * GET /api/v1/replenishments/repays/pending-review
 */
export function getPendingRepayReviewList(params = {}) {
  const { page, size, pageSize, ...rest } = params
  return get('/replenishments/repays/pending-review', {
    page: page ?? 1,
    size: size ?? pageSize ?? 10,
    ...rest,
  })
}

/**
 * 归仓审核通过。
 * POST /api/v1/replenishments/repays/{id}/approve
 */
export function approveRepayApply(id, data) {
  return post(`/replenishments/repays/${id}/approve`, data ?? {})
}

/**
 * 归仓审核拒绝。
 * POST /api/v1/replenishments/repays/{id}/reject
 */
export function rejectRepayApply(id, data) {
  return post(`/replenishments/repays/${id}/reject`, data ?? {})
}

/**
 * 归仓状态流详情。
 * GET /api/v1/replenishments/repays/{id}/flow
 */
export function getRepayFlow(id) {
  return get(`/replenishments/repays/${id}/flow`)
}

/**
 * 下级补仓分页（不含本人）。GET /replenishments/team
 * @param {{ page?: number, size?: number, pageSize?: number }} [params]
 */
export function fetchTeamReplenishments(params = {}) {
  return get('/replenishments/team', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/**
 * 下级归仓分页。GET /replenishments/repays/team
 */
export function fetchTeamRepays(params = {}) {
  return get('/replenishments/repays/team', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/** POST /replenishments/{id}/resubmit */
export function resubmitReplenishment(id, data) {
  return post(`/replenishments/${id}/resubmit`, data)
}

/** GET /replenishments/{id}/flow */
export function getReplenishmentFlow(id) {
  return get(`/replenishments/${id}/flow`)
}
// ——— 管理员补仓（/admin/replenishments/...）———

/** GET /admin/replenishments/pending */
export function getPendingReplenishments(params = {}) {
  return get('/admin/replenishments/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
    ...params,
  })
}

/** GET /admin/replenishments/all */
export function getAllAdminReplenishments(params = {}) {
  return get('/admin/replenishments/all', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
    ...params,
  })
}

/** POST /admin/replenishments/{id}/approve — body 可选 { remark } */
export function approveReplenishment(id, data) {
  return post(`/admin/replenishments/${id}/approve`, data ?? {})
}

/** POST /admin/replenishments/{id}/reject — body 建议 { remark } */
export function rejectReplenishment(id, data) {
  return post(`/admin/replenishments/${id}/reject`, data ?? {})
}

/** POST /admin/replenishments/{id}/assign — body { capitalUserId, remark? } */
export function assignReplenishment(id, data) {
  return post(`/admin/replenishments/${id}/assign`, data ?? {})
}

// ——— 资方执行人 / 申请人补仓动作 ———

/** GET /replenishments/assigned-to-me */
export function getAssignedReplenishments(params = {}) {
  return get('/replenishments/assigned-to-me', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
    ...params,
  })
}

/** POST /replenishments/{id}/capital-submit */
export function capitalSubmitReplenishment(id, data) {
  return post(`/replenishments/${id}/capital-submit`, data ?? {})
}

/** POST /replenishments/{id}/confirm-arrival — body 可选 { remark } */
export function confirmArrival(id, data) {
  return post(`/replenishments/${id}/confirm-arrival`, data ?? {})
}

/** POST /replenishments/{id}/reject-arrival — body 建议 { remark } */
export function rejectArrival(id, data) {
  return post(`/replenishments/${id}/reject-arrival`, data ?? {})
}

