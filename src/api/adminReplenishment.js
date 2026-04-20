import { getAdmin, postAdmin } from './request'

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
 * 同意补仓（可带打款凭证与备注，字段以后端为准）。
 * @param {string|number} id
 * @param {{ transferScreenshotUrl?: string, transferRemark?: string, remark?: string }} [data]
 */
export function approveReplenishmentAdmin(id, data) {
  return postAdmin(`/admin/replenishments/${id}/approve`, data ?? {})
}

/** POST /api/admin/replenishments/{id}/reject */
export function rejectReplenishmentAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/${id}/reject`, remark ? { remark } : {})
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
 * 待审核归仓列表（分页；可选 status 筛选归仓状态 1～4）。
 * GET /api/v1/admin/replenishments/repays/pending
 *
 * @typedef {{ id: number, repayNo?: string, status?: number, replenishPendingRepayAmount?: number, applicantNickname?: string }} RepayPendingBrief
 * @param {{ page?: number, size?: number, pageSize?: number, status?: number | string }} [params]
 */
export function fetchAdminRepaysPending(params = {}) {
  const { page, size, pageSize, status, ...rest } = params
  const q = {
    page: page ?? 1,
    size: size ?? pageSize ?? 10,
    ...rest,
  }
  if (status !== undefined && status !== null && status !== '' && status !== 'all') {
    const n = Number(status)
    if (Number.isFinite(n) && n >= 1 && n <= 4) q.status = n
  }
  return getAdmin('/admin/replenishments/repays/pending', q)
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
  return postAdmin(`/replenishments/repays/${id}/approve`, remark ? { remark } : {})
}

/** POST /api/admin/replenishments/repays/{id}/reject */
export function rejectRepayAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/repays/${id}/reject`, remark ? { remark } : {})
}
