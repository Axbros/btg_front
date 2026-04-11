import { postAdmin, getAdmin } from './request'

export function fetchPendingProfits(params) {
  return getAdmin('/admin/profits/pending', params)
}

export function approveProfit(data) {
  return postAdmin('/admin/profits/approve', data)
}

export function rejectProfit(data) {
  return postAdmin('/admin/profits/reject', data)
}
