import { get } from './request'

/** GET /api/v1/dashboard/pending-summary（与 axios 默认 baseURL 一致） */
export function getPendingSummary() {
  return get('/dashboard/pending-summary')
}
