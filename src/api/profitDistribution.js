import { get } from './request'

/** GET /api/v1/profit-distributions/report/{profitReportId}；beneficiaryDisplayName 仅根用户有值 */
export function fetchProfitDistributionByReportId(profitReportId) {
  return get(`/profit-distributions/report/${profitReportId}`)
}
