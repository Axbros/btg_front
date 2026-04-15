import {
  formatDateTime,
  formatMoney,
  formatRate,
  formatProfitFlowCombinedState,
  formatSettlementStatus,
  settlementStatusTagType,
} from '@/utils/format'

const DATA_SCOPE_MAP = {
  FULL_FINANCIAL: '完整数据',
  ANCESTOR_SUBCHAIN_FINANCIAL: '下级链路（含金额）',
  REPORTER_SUBCHAIN: '申报人视角',
  CHAIN_PARTICIPANT_SUBCHAIN: '参与链路视角',
  REPORTER_AMOUNTS_MASKED: '申报人视图（部分金额隐藏）',
  MIDDLE_AMOUNTS_MASKED: '中间层视图（上级金额隐藏）',
}

/** 链路顶层 / 层 settlementStatus 等与产品文案对齐（先于通用结算映射） */
const PROFIT_FLOW_STATUS_LABEL = {
  PENDING_SUBMIT: '待提交凭证',
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  RETURNED_FOR_EDIT: '已退回待修改',
  NONE: '无结算',
  FLOW_FINISHED: '全链路完成',
}

/**
 * @param {unknown} val
 * @returns {string}
 */
export function formatDataScope(val) {
  if (val == null || val === '') return '—'
  const k = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  return DATA_SCOPE_MAP[k] || String(val)
}

/**
 * @param {unknown} val
 * @returns {string}
 */
export function formatFlowStatus(val) {
  if (val == null || val === '') return '—'
  const k = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  const direct = PROFIT_FLOW_STATUS_LABEL[k]
  if (direct) return direct
  const u = formatProfitFlowCombinedState(val)
  if (u) return u
  const s = formatSettlementStatus(val)
  if (s === '-' || s === '') return '—'
  return s
}

/** 金额：null 展示为 `--`（非 masked） */
export function formatMoneyOrDash(value) {
  if (value === null || value === undefined || value === '') return '--'
  return formatMoney(value)
}

/** 比例：null 展示为 `--` */
export function formatRateOrDash(value) {
  if (value === null || value === undefined || value === '') return '--'
  return formatRate(value)
}

/**
 * @param {unknown} value
 * @param {boolean} financialsMasked
 * @returns {string}
 */
export function formatMoneyMasked(value, financialsMasked) {
  if (financialsMasked === true) return '金额已隐藏'
  if (value === null || value === undefined || value === '') return '--'
  return formatMoney(value)
}

/**
 * @param {unknown} value
 * @param {boolean} financialsMasked
 * @returns {string}
 */
export function formatRateMasked(value, financialsMasked) {
  if (financialsMasked === true) return '--'
  if (value === null || value === undefined || value === '') return '--'
  return formatRate(value)
}

/**
 * 切片比例差 upperRatio − lowerRatio（绝对比例之差对应本层分润区间）
 * @param {unknown} upper
 * @param {unknown} lower
 * @param {boolean} financialsMasked
 * @returns {string}
 */
export function formatSliceDiffRate(upper, lower, financialsMasked) {
  if (financialsMasked === true) return '--'
  if (upper == null || lower == null || upper === '' || lower === '') return '--'
  const u = Number(upper)
  const l = Number(lower)
  if (Number.isNaN(u) || Number.isNaN(l)) return '--'
  return formatRate(u - l)
}

/**
 * @param {unknown} val
 * @returns {string}
 */
export function formatDateTimeCell(val) {
  if (val == null || val === '') return '--'
  const d = formatDateTime(val)
  return d === '-' ? '--' : d
}

export { settlementStatusTagType as profitFlowLayerSettlementTagType }
