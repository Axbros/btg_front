import { get, post, postWithoutBody } from './request'

/** GET /api/v1/admin/replenishments/pending */
export function fetchAdminPendingReplenishments(params = {}) {
  return get('/admin/replenishments/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/**
 * POST /api/v1/admin/replenishments/{id}/approve
 * 资方终审确认（通常 8→2）；无请求体。
 */
export function approveReplenishmentAdmin(id) {
  return postWithoutBody(`/admin/replenishments/${id}/approve`)
}

/** POST /api/v1/admin/replenishments/{id}/reject */
export function rejectReplenishmentAdmin(id, remark) {
  return post(`/admin/replenishments/${id}/reject`, remark ? { remark } : {})
}

/** POST /api/v1/admin/replenishments/{id}/accept — 受理（1→7） */
export function acceptReplenishmentAdmin(id) {
  return post(`/admin/replenishments/${id}/accept`, {})
}

/**
 * 资方上传打款凭证与备注（7→8）。POST /admin/replenishments/{id}/capital-voucher
 * Body 与 ReplenishmentApproveDTO 一致。
 * @param {string|number} id
 * @param {{ transferScreenshotUrl: string, transferRemark?: string }} data
 */
export function submitReplenishmentCapitalVoucherAdmin(id, data) {
  return post(`/admin/replenishments/${id}/capital-voucher`, data)
}

/**
 * 待审核归仓列表（分页项仅含 id、repayNo 等简要字段）。
 * GET /api/v1/admin/replenishments/repays/pending
 *
 * @typedef {{ id: number, repayNo?: string, repay_no?: string }} RepayPendingBrief
 * @param {{ page?: number, size?: number, pageSize?: number }} [params]
 */
export function fetchAdminRepaysPending(params = {}) {
  return get('/admin/replenishments/repays/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/** @deprecated 请使用 {@link fetchAdminRepaysPending} */
export const fetchAdminPendingRepays = fetchAdminRepaysPending

/**
 * 归仓申请详情（完整 RepayApplyVO）。
 * GET /api/v1/admin/replenishments/repays/{id}
 *
 * @param {string|number} id
 */
export function fetchAdminRepayDetail(id) {
  return get(`/admin/replenishments/repays/${id}`)
}

/** POST /api/v1/admin/replenishments/repays/{id}/approve */
export function approveRepayAdmin(id, remark) {
  return post(`/admin/replenishments/repays/${id}/approve`, remark ? { remark } : {})
}

/** POST /api/v1/admin/replenishments/repays/{id}/reject */
export function rejectRepayAdmin(id, remark) {
  return post(`/admin/replenishments/repays/${id}/reject`, remark ? { remark } : {})
}
