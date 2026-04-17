import { getAdmin, postAdmin, postAdminWithoutBody } from './request'

/** GET /api/admin/replenishments/pending */
export function fetchAdminPendingReplenishments(params = {}) {
  return getAdmin('/admin/replenishments/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/** GET /api/admin/replenishments/{id} */
export function fetchAdminReplenishmentDetail(id) {
  return getAdmin(`/admin/replenishments/${id}`)
}

/**
 * POST /api/admin/replenishments/{id}/approve
 * 资方终审确认（通常 8→2）；无请求体。
 */
export function approveReplenishmentAdmin(id) {
  return postAdminWithoutBody(`/admin/replenishments/${id}/approve`)
}

/** POST /api/admin/replenishments/{id}/reject */
export function rejectReplenishmentAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/${id}/reject`, remark ? { remark } : {})
}

/** POST /api/admin/replenishments/{id}/accept — 受理（1→7） */
export function acceptReplenishmentAdmin(id) {
  return postAdmin(`/admin/replenishments/${id}/accept`, {})
}

/**
 * POST /admin/replenishments/{id}/capital-voucher（资方打款凭证与备注）
 *
 * - 状态 7：`transferScreenshotUrl` 必填，提交后 → 8（待终审）。
 * - 状态 8：可多次调用；传新 `transferScreenshotUrl` 则覆盖，不传或空串保留库中已有凭证；可只改备注；状态保持 8。
 * - 其它状态：后端拒绝。
 *
 * @param {string|number} id
 * @param {{ transferScreenshotUrl?: string, transferRemark?: string }} data
 */
export function submitCapitalVoucherForAdmin(id, data) {
  return postAdmin(`/admin/replenishments/${id}/capital-voucher`, data)
}

/** @deprecated 请使用 {@link submitCapitalVoucherForAdmin} */
export const submitReplenishmentCapitalVoucherAdmin = submitCapitalVoucherForAdmin

/**
 * 待审核归仓列表（分页项仅含 id、repayNo 等简要字段）。
 * GET /api/v1/admin/replenishments/repays/pending
 *
 * @typedef {{ id: number, repayNo?: string }} RepayPendingBrief
 * @param {{ page?: number, size?: number, pageSize?: number }} [params]
 */
export function fetchAdminRepaysPending(params = {}) {
  return getAdmin('/admin/replenishments/repays/pending', {
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
  return getAdmin(`/admin/replenishments/repays/${id}`)
}

/** POST /api/admin/replenishments/repays/{id}/approve */
export function approveRepayAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/repays/${id}/approve`, remark ? { remark } : {})
}

/** POST /api/admin/replenishments/repays/{id}/reject */
export function rejectRepayAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/repays/${id}/reject`, remark ? { remark } : {})
}
