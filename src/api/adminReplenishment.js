import { getAdmin, postAdmin } from './request'

/** GET /api/admin/replenishments/pending */
export function fetchAdminPendingReplenishments(params = {}) {
  return getAdmin('/admin/replenishments/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/**
 * POST /api/admin/replenishments/{id}/approve
 * @param {string} data.transferScreenshotUrl 必填
 * @param {string} [data.transferRemark] 选填
 */
export function approveReplenishmentAdmin(id, data) {
  return postAdmin(`/admin/replenishments/${id}/approve`, data)
}

/** POST /api/admin/replenishments/{id}/reject */
export function rejectReplenishmentAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/${id}/reject`, remark ? { remark } : {})
}

/** GET /api/admin/replenishments/repays/pending */
export function fetchAdminPendingRepays(params = {}) {
  return getAdmin('/admin/replenishments/repays/pending', {
    page: params.page ?? 1,
    size: params.size ?? params.pageSize ?? 10,
  })
}

/** POST /api/admin/replenishments/repays/{id}/approve */
export function approveRepayAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/repays/${id}/approve`, remark ? { remark } : {})
}

/** POST /api/admin/replenishments/repays/{id}/reject */
export function rejectRepayAdmin(id, remark) {
  return postAdmin(`/admin/replenishments/repays/${id}/reject`, remark ? { remark } : {})
}
