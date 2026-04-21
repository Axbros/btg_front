import { postAdmin, getAdmin } from './request'

/**
 * 管理端：补仓转派等场景选人。
 * GET /admin/users/picker-options → UserPickerOptionVO[]（id、nickname，昵称为空则为 null）
 */
export function fetchAdminUserPickerOptions() {
  return getAdmin('/admin/users/picker-options')
}

export function fetchPendingProfits(params) {
  return getAdmin('/admin/profits/pending', params)
}

export function approveProfit(data) {
  return postAdmin('/admin/profits/approve', data)
}

export function rejectProfit(data) {
  return postAdmin('/admin/profits/reject', data)
}
