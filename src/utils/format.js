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

/**
 * btg_profit_report.status：
 * 1 待直属上级审核 2 已进入结算链 3 历史终局拒绝 4 全链路完成 5 已退回申报人修改
 */
const PROFIT_REPORT_STATUS_NUM = {
  1: '待直属上级审核',
  2: '已进入结算链',
  3: '历史终局拒绝',
  4: '全链路完成',
  5: '已退回申报人修改',
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

/** UserStatus：-1 待完善；0 待审核；1 正常 */
const USER_STATUS_NUM = {
  [-1]: '待完善',
  0: '待审核',
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
  PENDING_DIRECT_REVIEW: '待直属上级审核',
  PENDING_REVIEW: '待审核',
  IN_SETTLEMENT_CHAIN: '已进入结算链',
  REJECTED: '已拒绝',
  ALL_COMPLETED: '全链路完成',
  RETURNED_TO_APPLICANT: '已退回申报人修改',
  PROFIT_REJECTED: '历史终局拒绝',
  DIRECT_REVIEW_PASSED: '已进入结算链（直属已通过）',
}

/** profit-flow layers / 与后端 ProfitFlowLayerState 等对齐（先于 formatProfitRecordStatus 定义） */
const PROFIT_FLOW_COMBINED_STATE_STR = {
  PENDING_DIRECT_REVIEW: '待直属上级审核',
  RETURNED_TO_APPLICANT: '已退回申报人修改',
  PROFIT_REJECTED: '历史终局拒绝',
  DIRECT_REVIEW_PASSED: '已进入结算链（直属已通过）',
  SETTLEMENT_NOT_STARTED: '尚未轮到该层',
  SETTLEMENT_PENDING_SUBMIT: '付款人待提交转账凭证',
  SETTLEMENT_PENDING_REVIEW: '待收款上级审核',
  SETTLEMENT_APPROVED: '已通过',
  SETTLEMENT_REJECTED: '已拒绝',
  RETURNED_FOR_EDIT: '已退回待修改',
  NONE: '无结算',
  FLOW_FINISHED: '全链路完成',
}

/**
 * @param {unknown} val
 * @returns {string} 有映射则返回中文，否则返回空串（便于调用方再 fallback）
 */
export function formatProfitFlowCombinedState(val) {
  if (val === null || val === undefined || val === '') return ''
  const k = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  return PROFIT_FLOW_COMBINED_STATE_STR[k] || ''
}

export function formatProfitRecordStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && PROFIT_REPORT_STATUS_NUM[val] != null) return PROFIT_REPORT_STATUS_NUM[val]
  if (typeof val === 'number' && PROFIT_STATUS_NUM[val] != null) return PROFIT_STATUS_NUM[val]
  const sk = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  const unified = formatProfitFlowCombinedState(val)
  if (unified) return unified
  if (PROFIT_REPORT_STATUS_STR[sk]) return PROFIT_REPORT_STATUS_STR[sk]
  return formatStatus(val)
}

/**
 * 利润上报是否处于「退回申报人可重提」
 * 后端可能返回数字 5 或字符串枚举 RETURNED_TO_APPLICANT
 */
export function isProfitReportReturnedToApplicant(status) {
  if (status === null || status === undefined || status === '') return false
  const sk = String(status).trim().toUpperCase()
  if (sk === 'RETURNED_TO_APPLICANT') return true
  const n = Number(sk)
  return Number.isFinite(n) && n === 5
}

/** 利润上报记录 status → van-tag type */
export function profitRecordStatusTagType(val) {
  if (val === null || val === undefined || val === '') return 'default'
  const sk = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  if (sk === 'REJECTED' || sk === 'PROFIT_REJECTED') return 'danger'
  if (sk === 'RETURNED_TO_APPLICANT') return 'warning'
  if (sk === 'ALL_COMPLETED' || sk === 'IN_SETTLEMENT_CHAIN' || sk === 'DIRECT_REVIEW_PASSED') return 'success'
  if (sk === 'PENDING_DIRECT_REVIEW' || sk === 'PENDING_REVIEW') return 'warning'
  const n = Number(val)
  if (!Number.isNaN(n)) {
    if (n === 3) return 'danger'
    if (n === 4 || n === 2) return 'success'
    if (n === 1 || n === 5) return 'warning'
  }
  return 'default'
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
  /** profit-flow 结算层枚举 */
  SETTLEMENT_NOT_STARTED: '尚未轮到该层',
  SETTLEMENT_PENDING_SUBMIT: '付款人待提交转账凭证',
  SETTLEMENT_PENDING_REVIEW: '待收款上级审核',
  SETTLEMENT_APPROVED: '已通过',
  SETTLEMENT_REJECTED: '已拒绝',
  /** 分润链路层 / 顶层状态 */
  NONE: '无结算',
  FLOW_FINISHED: '全链路完成',
}

export function formatSettlementStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && SETTLEMENT_STATUS_NUM[val] != null) return SETTLEMENT_STATUS_NUM[val]
  const unified = formatProfitFlowCombinedState(val)
  if (unified) return unified
  const key = String(val)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  if (SETTLEMENT_STATUS_STR[key]) return SETTLEMENT_STATUS_STR[key]
  if (typeof val === 'number' && PROFIT_STATUS_NUM[val] != null) return PROFIT_STATUS_NUM[val]
  return formatStatus(val)
}

/** 结算单 status → van-tag type */
export function settlementStatusTagType(val) {
  const s = val
  const sk =
    typeof s === 'string'
      ? s
          .trim()
          .toUpperCase()
          .replace(/-/g, '_')
      : ''
  if (sk === 'SETTLEMENT_APPROVED' || s === 'APPROVED' || s === 4) return 'success'
  if (sk === 'SETTLEMENT_REJECTED' || s === 'REJECTED' || s === 5) return 'danger'
  if (sk === 'SETTLEMENT_PENDING_REVIEW' || s === 'PENDING_REVIEW' || s === 'PENDING' || s === 3) return 'primary'
  if (sk === 'SETTLEMENT_PENDING_SUBMIT' || s === 'PENDING_SUBMIT' || s === 2) return 'warning'
  if (sk === 'SETTLEMENT_NOT_STARTED' || sk === 'NONE') return 'default'
  if (sk === 'FLOW_FINISHED') return 'success'
  if (s === 'INIT' || s === 1) return 'default'
  const n = Number(s)
  if (Number.isNaN(n)) return 'default'
  if (n === 4) return 'success'
  if (n === 5) return 'danger'
  if (n === 3) return 'primary'
  if (n === 2) return 'warning'
  if (n === 1) return 'default'
  return 'default'
}

export function formatStrategyStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number' && STRATEGY_STATUS_NUM[val] != null) return STRATEGY_STATUS_NUM[val]
  return formatStatus(val)
}

export function formatUserStatus(val) {
  if (val === null || val === undefined || val === '') return '-'
  const n = Number(val)
  if (!Number.isNaN(n) && USER_STATUS_NUM[n] != null) return USER_STATUS_NUM[n]
  return formatStatus(val)
}

/** 账号 status：-1 待完善；0 待审核；1 正常 */
export function userStatusTagType(val) {
  const n = Number(val)
  if (n === 1) return 'success'
  if (n === 0) return 'primary'
  if (n === -1) return 'warning'
  return 'default'
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

/**
 * 补仓申请 status：
 * 1 待审核 2 审核通过 3 审核拒绝（历史）4 部分归还 5 已结清 6 已关闭
 * 7/8 资方流程（兼容）9 已退回待修改
 */
const REPLENISHMENT_STATUS_NUM = {
  1: '待审核',
  2: '审核通过',
  3: '审核拒绝（历史）',
  4: '部分归还',
  5: '已结清',
  6: '已关闭',
  7: '待资方补充资料',
  8: '待资方终审确认',
  9: '已退回待修改',
}

export function formatReplenishmentStatus(val) {
  if (val === null || val === undefined || val === '') return '—'
  const n = Number(val)
  if (!Number.isNaN(n) && REPLENISHMENT_STATUS_NUM[n] != null) return REPLENISHMENT_STATUS_NUM[n]
  return String(val)
}

/** 归仓：1 待审核 2 审核通过 3 审核拒绝（历史）4 已退回待修改 */
const REPAY_STATUS_NUM = {
  1: '待审核',
  2: '审核通过',
  3: '审核拒绝（历史）',
  4: '已退回待修改',
}

export function formatRepayStatus(val) {
  if (val === null || val === undefined || val === '') return '—'
  const n = Number(val)
  if (!Number.isNaN(n) && REPAY_STATUS_NUM[n] != null) return REPAY_STATUS_NUM[n]
  return String(val)
}

export function replenishmentStatusTagType(val) {
  const n = Number(val)
  if (n === 2 || n === 5) return 'success'
  if (n === 3 || n === 6) return 'danger'
  if (n === 1 || n === 4 || n === 7 || n === 8 || n === 9) return 'warning'
  return 'default'
}

export function repayStatusTagType(val) {
  const n = Number(val)
  if (n === 2) return 'success'
  if (n === 3) return 'danger'
  if (n === 1 || n === 4) return 'warning'
  return 'default'
}
