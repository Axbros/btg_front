import { get, post } from './request'

/** POST /api/v1/replenishments */
export function submitReplenishment(data) {
  return post('/replenishments', data)
}

/** GET /api/v1/replenishments/mine */
export function fetchReplenishmentMine(params = {}) {
  return get('/replenishments/mine', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/** GET /api/v1/replenishments/current */
export function fetchReplenishmentCurrent() {
  return get('/replenishments/current')
}

/** POST /api/v1/replenishments/repays */
export function submitRepay(data) {
  return post('/replenishments/repays', data)
}

/** GET /api/v1/replenishments/repays/mine */
export function fetchRepayMine(params = {}) {
  return get('/replenishments/repays/mine', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}
