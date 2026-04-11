import { get, post, put } from './request'

export function fetchPendingProfits(params) {
  return get('/admin/profits/pending', params)
}

export function approveProfit(data) {
  return post('/admin/profits/approve', data)
}

export function rejectProfit(data) {
  return post('/admin/profits/reject', data)
}

export function fetchAdminStrategies(params) {
  return get('/admin/strategies', params)
}

export function createAdminStrategy(data) {
  return post('/admin/strategies', data)
}

/** PUT /api/admin/strategies/{id} — body: StrategySaveRequest */
export function updateAdminStrategy(id, data) {
  return put(`/admin/strategies/${id}`, data)
}
