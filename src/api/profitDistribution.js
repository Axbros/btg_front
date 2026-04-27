import { get } from './request'
import { normalizeProfitReport } from '@/utils/profitReportNormalize'

/** GET /api/v1/profit-distributions/report/{profitReportId}；beneficiaryDisplayName 仅根用户有值 */
export function fetchProfitDistributionByReportId(profitReportId) {
  return get(`/profit-distributions/report/${profitReportId}`).then((data) => normalizeProfitReport(data))
}
