import { get, post } from './request'

/** POST /api/profit-reports — body 与后端 ProfitReportSubmitRequest 对齐 */
export function submitProfitReport(data) {
  return post('/profit-reports', data)
}

/** GET /api/profit-reports/mine — query: page、size（兼容 pageSize） */
export function fetchMyProfitReports(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/profit-reports/mine', { page, size })
}

/** GET /api/profit-reports/{id} */
export function fetchProfitReportById(id) {
  return get(`/profit-reports/${id}`)
}
