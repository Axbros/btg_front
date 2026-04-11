import { get, post } from './request'

/** GET /api/v1/settlements/mine-payables */
export function fetchMyPendingPaySettlements(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/mine-payables', { page, size })
}

/** GET /api/v1/settlements/pending-review */
export function fetchMyPendingReviewSettlements(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/pending-review', { page, size })
}

/** GET /api/v1/settlements/{id} — profitScreenshotUrl 利润截图；transferScreenshotUrl 上缴/划转截图 */
export function fetchSettlementById(id) {
  return get(`/settlements/${id}`)
}

/** POST /api/v1/settlements/{id}/submit */
export function submitSettlementTransfer(id, data) {
  return post(`/settlements/${id}/submit`, data)
}

/** POST /api/v1/settlements/{id}/approve */
export function approveSettlement(id, data = {}) {
  return post(`/settlements/${id}/approve`, data)
}

/** POST /api/v1/settlements/{id}/reject */
export function rejectSettlement(id, data = {}) {
  return post(`/settlements/${id}/reject`, data)
}
