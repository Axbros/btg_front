import { get, post } from './request'

export function fetchPendingProfits(params) {
  return get('/admin/profits/pending', params)
}

export function approveProfit(data) {
  return post('/admin/profits/approve', data)
}

export function rejectProfit(data) {
  return post('/admin/profits/reject', data)
}
