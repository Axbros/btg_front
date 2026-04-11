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

/** GET /api/v1/settlements/{rootReportId} — id 为 root_report_id，且本人为付款人 */
export function fetchSettlementByRootReportId(rootReportId) {
  return get(`/settlements/${rootReportId}`)
}

/** GET /api/v1/settlements/row/{settlementId} — 结算单主键；本人为付款人或收款人 */
export function fetchSettlementRowById(settlementId) {
  return get(`/settlements/row/${settlementId}`)
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
