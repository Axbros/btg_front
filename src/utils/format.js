/**
 * 金额保留两位小数展示
 */
export function formatMoney(val) {
  if (val === null || val === undefined || val === '') return '0.00'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return n.toFixed(2)
}

/**
 * 日期时间格式化
 */
export function formatDateTime(val) {
  if (val === null || val === undefined || val === '') return '-'
  const d = val instanceof Date ? val : new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 比例：兼容 0.15 / 15 两种
 */
export function formatRate(val) {
  if (val === null || val === undefined || val === '') return '-'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  const pct = n > 1 ? n : n * 100
  return `${Number(pct.toFixed(4))}%`
}

const STATUS_MAP = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  SUCCESS: '成功',
  FAILED: '失败',
  ACTIVE: '启用',
  INACTIVE: '停用',
  DISABLED: '停用',
  ENABLED: '启用',
}

/** btg_profit_report.status：1 待直属上级审核；2 已进入结算链；3 拒绝；4 全链路完成 */
const PROFIT_REPORT_STATUS_NUM = {
  1: '待直属上级审核',
  2: '通过',
  3: '拒绝',
  4: '全链路完成',
}

/** 兼容旧利润单状态码 */
const PROFIT_STATUS_NUM = {
  ...PROFIT_REPORT_STATUS_NUM,
}

/** CommissionRecordStatus：1 = CONFIRMED */
const COMMISSION_STATUS_NUM = {
  1: '已确认',
}

/** StrategyStatus：0 DISABLED, 1 ENABLED */
const STRATEGY_STATUS_NUM = {
  0: '停用',
  1: '启用',
}

/** UserStatus：0 DISABLED, 1 NORMAL */
const USER_STATUS_NUM = {
  0: '已停用',
  1: '正常',
}

/**
 * 通用状态（字符串枚举名或数字）
 */
export function formatStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && Number.isFinite(val)) {
    if (PROFIT_STATUS_NUM[val] != null) return PROFIT_STATUS_NUM[val]
    if (COMMISSION_STATUS_NUM[val] != null) return COMMISSION_STATUS_NUM[val]
    if (STRATEGY_STATUS_NUM[val] != null) return STRATEGY_STATUS_NUM[val]
    if (USER_STATUS_NUM[val] != null) return USER_STATUS_NUM[val]
  }
  const key = String(val).toUpperCase()
  return STATUS_MAP[key] || String(val)
}

const PROFIT_REPORT_STATUS_STR = {
  PENDING_DIRECT_REVIEW: '待上级审核',
  IN_SETTLEMENT_CHAIN: '已通过',
  REJECTED: '已拒绝',
  ALL_COMPLETED: '全链路完成',
}

export function formatProfitRecordStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && PROFIT_REPORT_STATUS_NUM[val] != null) return PROFIT_REPORT_STATUS_NUM[val]
  if (typeof val === 'number' && PROFIT_STATUS_NUM[val] != null) return PROFIT_STATUS_NUM[val]
  const sk = String(val).toUpperCase()
  if (PROFIT_REPORT_STATUS_STR[sk]) return PROFIT_REPORT_STATUS_STR[sk]
  return formatStatus(val)
}

export function formatCommissionRecordStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && COMMISSION_STATUS_NUM[val] != null) return COMMISSION_STATUS_NUM[val]
  return formatStatus(val)
}

/** btg_settlement_order.status：1 INIT；2 待提交凭证；3 待上级审核；4 通过；5 拒绝 */
const SETTLEMENT_STATUS_NUM = {
  1: '未激活',
  2: '待提交凭证',
  3: '待上级审核',
  4: '已通过',
  5: '已拒绝',
}

/** 结算单状态（兼容数字枚举与字符串） */
const SETTLEMENT_STATUS_STR = {
  PENDING: '待审核',
  PENDING_REVIEW: '待上级审核',
  PENDING_SUBMIT: '待提交凭证',
  INIT: '未激活',
  PENDING_PAYMENT: '待支付',
  PENDING_PAY: '待支付',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CONFIRMED: '已确认',
}

export function formatSettlementStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && SETTLEMENT_STATUS_NUM[val] != null) return SETTLEMENT_STATUS_NUM[val]
  const key = String(val).toUpperCase()
  if (SETTLEMENT_STATUS_STR[key]) return SETTLEMENT_STATUS_STR[key]
  if (typeof val === 'number' && PROFIT_STATUS_NUM[val] != null) return PROFIT_STATUS_NUM[val]
  return formatStatus(val)
}

export function formatStrategyStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && STRATEGY_STATUS_NUM[val] != null) return STRATEGY_STATUS_NUM[val]
  return formatStatus(val)
}

export function formatUserStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && USER_STATUS_NUM[val] != null) return USER_STATUS_NUM[val]
  return formatStatus(val)
}

/** 下级列表 KYC：0 未提交 1 待审核 2 通过 3 拒绝 */
const KYC_STATUS = {
  0: '未提交',
  1: '待审核',
  2: '通过',
  3: '拒绝',
}

export function formatKycStatus(val) {
  if (val === null || val === undefined || val === '') return '—'
  const n = Number(val)
  if (!Number.isNaN(n) && KYC_STATUS[n] != null) return KYC_STATUS[n]
  return String(val)
}

/** van-tag type：通过 success，拒绝 danger，待审核 warning，其余 default */
export function kycStatusTagType(val) {
  const n = Number(val)
  if (n === 2) return 'success'
  if (n === 3) return 'danger'
  if (n === 1) return 'warning'
  return 'default'
}
