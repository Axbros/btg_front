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
 * 可归仓补仓单列表（审核通过或部分归还且仍有剩余）。
 * GET {baseURL}/replenishments/repayable
 */
export function getRepayableReplenishments() {
  return get('/replenishments/repayable')
}

/**
 * 提交归仓申请。
 * POST {baseURL}/replenishments/repays
 * @param {{ replenishApplyId: number, repayAmount: number, repayScreenshotUrl: string }} data
 */
export function submitRepayApply(data) {
  return post('/replenishments/repays', data)
}

/** @deprecated 与 submitRepayApply 相同，保留兼容 */
export const submitRepay = submitRepayApply

/**
 * 我的归仓申请分页。
 * GET {baseURL}/replenishments/repays/mine
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
 * 归仓详情（完整 VO，含 replenishmentApply）。
 * GET /api/v1/replenishments/repays/{id}
 */
export function fetchRepayMineDetail(id) {
  return get(`/replenishments/repays/${id}`)
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
 * 分页体与 /replenishments/team 一致：records、total、current、size、pages；行内 nickname、mobile、replenishAmount、status、id 等。
 */
export function fetchTeamRepays(params = {}) {
  return get('/replenishments/repays/team', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}
