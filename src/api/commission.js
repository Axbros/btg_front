import { get } from './request'

/**
 * GET /api/commissions/mine — query: page、size
 * 列表项除原字段外可含：来源用户 fromNickname/fromMobile（或 fromUserNickname/fromUserMobile）、strategyName、profitRecordNo（申报单号）
 */
export function fetchMyCommissions(params) {
  return get('/commissions/mine', params)
}

/** GET /api/commissions/mine/{id} — 单条佣金流水（与列表项同结构，供详情页展示完整卡片） */
export function fetchMyCommissionById(id) {
  return get(`/commissions/mine/${id}`)
}
