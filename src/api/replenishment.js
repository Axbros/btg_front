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

/** POST /api/v1/replenishments/repays */
export function submitRepay(data) {
  return post('/replenishments/repays', data)
}

/**
 * 我的归仓分页（列表项仅 id、repayNo 等简要字段）。
 * GET /api/v1/replenishments/repays/mine
 */
export function fetchRepayMine(params = {}) {
  return get('/replenishments/repays/mine', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
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
 */
export function fetchTeamRepays(params = {}) {
  return get('/replenishments/repays/team', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}
