import { get, post, put } from './request'
import { normalizeProfitReport } from '@/utils/profitReportNormalize'

/**
 * GET /api/v1/profit-configs/self-under-parent — 分润配置平铺 + parentExchangeUid（团队长 exchange_uid）
 * @param {Record<string, unknown>} [config] — 可传 `{ skipGlobalToast: true }` 由调用方处理错误提示
 */
export function fetchSelfProfitConfigUnderParent(config = {}) {
  return get('/profit-configs/self-under-parent', undefined, config).then((data) => {
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
      return normalizeProfitReport(data)
    }
    return data
  })
}

/** GET /api/v1/profit-configs/my-children — 每项含 commissionMode 时经 {@link normalizeProfitReport} */
export function fetchMyChildProfitConfigs() {
  return get('/profit-configs/my-children').then((raw) => {
    if (!Array.isArray(raw)) return []
    return raw.map((row) => normalizeProfitReport(row))
  })
}

/**
 * POST /api/v1/profit-configs — 与后端创建 DTO 对齐时常见：childUserId、guaranteeRatio、nonGuaranteeRatio、commissionMode
 * @param {Record<string, unknown>} data
 */
export function createProfitConfig(data) {
  return post('/profit-configs', data)
}

/**
 * PUT /api/v1/profit-configs/{id} — 与后端 ProfitConfigUpdateRequest 一致：
 * guaranteeRatio、nonGuaranteeRatio、commissionMode（GUARANTEE | NON_GUARANTEE）
 * @param {Record<string, unknown>} data
 */
export function updateProfitConfig(id, data) {
  return put(`/profit-configs/${id}`, data)
}
