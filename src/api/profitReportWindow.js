import { get, postWithoutBody } from './request'

/** GET /api/v1/admin/profit-report-window/today — 根用户 */
export function fetchProfitReportWindowToday() {
  return get('/admin/profit-report-window/today')
}

/** POST /api/v1/admin/profit-report-window/start — 无 body，幂等 */
export function postProfitReportWindowStart() {
  return postWithoutBody('/admin/profit-report-window/start')
}

/** POST /api/v1/admin/profit-report-window/stop — 无 body */
export function postProfitReportWindowStop() {
  return postWithoutBody('/admin/profit-report-window/stop')
}
