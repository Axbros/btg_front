import { get, post } from './request'

/** 路径段须为纯数字，避免与 mine-payables、approved 等静态段混淆 */
function settlementNumericSegment(id) {
  const s = String(id ?? '').trim()
  if (!/^\d+$/.test(s)) {
    throw new Error(`结算单 id 须为数字：${id}`)
  }
  return s
}

/**
 * GET /api/v1/settlements/mine-payables
 * 不传 status：本人为付款人且状态为 2、3 的待办；status=1～5 时按 SettlementOrderStatus 筛选。
 */
export function fetchMyPendingPaySettlements(params = {}) {
  const { page, size, pageSize, status, ...rest } = params
  const q = {
    page: page ?? 1,
    size: size ?? pageSize ?? 10,
    ...rest,
  }
  if (status !== undefined && status !== null && status !== '') {
    const sn = Number(status)
    if (Number.isFinite(sn) && sn >= 1 && sn <= 5) {
      q.status = sn
    }
  }
  return get('/settlements/mine-payables', q)
}

/** GET /api/v1/settlements/pending-review — 本人为收款上级的待审核；Page<SettlementOrder> */
export function fetchMyPendingReviewSettlements(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/pending-review', { page, size })
}

/** GET /api/v1/settlements/approved — 已通过（同上 to_user）；分页同 pending-review */
export function fetchMyApprovedSettlements(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/approved', { page, size })
}

/** GET /api/v1/settlements/rejected — 已拒绝（同上）；分页同 pending-review */
export function fetchMyRejectedSettlements(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/rejected', { page, size })
}

/** GET /api/v1/settlements/review-all — 本人审核过的全部（分页） */
export function fetchSettlementReviewAll(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/settlements/review-all', { page, size })
}

/** GET /api/v1/settlements/{rootReportId} — id 为 root_report_id，且本人为付款人 */
export function fetchSettlementByRootReportId(rootReportId) {
  return get(`/settlements/${settlementNumericSegment(rootReportId)}`)
}

/** GET /api/v1/settlements/row/{settlementId} — 结算单主键；本人为付款人或收款人 */
export function fetchSettlementRowById(settlementId) {
  return get(`/settlements/row/${settlementNumericSegment(settlementId)}`)
}

/** GET /api/v1/settlements/{rootReportId}/profit-flow — ProfitFlowDetailVO（含 layers 等） */
export function getSettlementProfitFlow(rootReportId) {
  return get(`/settlements/${settlementNumericSegment(rootReportId)}/profit-flow`)
}

/** 与 {@link getSettlementProfitFlow} 同一路径，语义为「利润分润链路详情」 */
export function getProfitFlowDetail(rootReportId) {
  return getSettlementProfitFlow(rootReportId)
}

/** POST /api/v1/settlements/{id}/submit */
export function submitSettlementTransfer(id, data) {
  return post(`/settlements/${settlementNumericSegment(id)}/submit`, data)
}

/** POST /api/v1/settlements/{id}/approve */
export function approveSettlement(id, data = {}) {
  return post(`/settlements/${settlementNumericSegment(id)}/approve`, data)
}

/** POST /api/v1/settlements/{id}/reject */
export function rejectSettlement(id, data = {}) {
  return post(`/settlements/${settlementNumericSegment(id)}/reject`, data)
}
