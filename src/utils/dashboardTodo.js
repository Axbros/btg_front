/**
 * 首页待办 / 流转展示：todoType、节点状态文案与跳转路径（与后端约定一致）。
 *
 * PROFIT_REPORT_RETURNED：勿再默认进 `/profit-report/:id/resubmit`；无 settlementOrderId 时同步进待支付列表，
 * 卡片/按钮侧用 `src/utils/profitReportSettlementBranch.js` 的 resolveProfitResubmitOrSettlementTransferNavigation 按 status + 身份分支。
 */
import {
  formatProfitFlowCombinedState,
  formatProfitRecordStatus,
  formatQualificationStatus,
  formatReplenishmentStatus,
  formatRepayStatus,
  formatSettlementStatus,
} from '@/utils/format'

/** @typedef {{ todoType?: string, businessId?: string|number, routeHint?: string, currentStatus?: unknown }} DashboardTodoItem */

export const DASHBOARD_TODO_TYPES = {
  SETTLEMENT_PENDING_PAY: 'SETTLEMENT_PENDING_PAY',
  SETTLEMENT_PENDING_REVIEW: 'SETTLEMENT_PENDING_REVIEW',
  PROFIT_REPORT_PENDING_REVIEW: 'PROFIT_REPORT_PENDING_REVIEW',
  PROFIT_REPORT_CHAIN_WATCH: 'PROFIT_REPORT_CHAIN_WATCH',
  PROFIT_REPORT_RETURNED: 'PROFIT_REPORT_RETURNED',
  REPLENISHMENT_PENDING_REVIEW: 'REPLENISHMENT_PENDING_REVIEW',
  /** 补仓待办（与 dashboard / 后端枚举扩展） */
  REPLENISHMENT_ADMIN_REVIEW: 'REPLENISHMENT_ADMIN_REVIEW',
  REPLENISHMENT_CAPITAL_SUBMIT: 'REPLENISHMENT_CAPITAL_SUBMIT',
  REPLENISHMENT_APPLICANT_CONFIRM: 'REPLENISHMENT_APPLICANT_CONFIRM',
  REPLENISHMENT_CHAIN_WATCH: 'REPLENISHMENT_CHAIN_WATCH',
  REPLENISHMENT_RETURNED: 'REPLENISHMENT_RETURNED',
  /** 兼容旧待办枚举 */
  REPLENISHMENT_REPAY_PENDING_REVIEW: 'REPLENISHMENT_REPAY_PENDING_REVIEW',
  REPLENISHMENT_REPAY_RETURNED: 'REPLENISHMENT_REPAY_RETURNED',
  /** 资方执行用户待审归仓 */
  REPLENISHMENT_REPAY_CAPITAL_REVIEW: 'REPLENISHMENT_REPAY_CAPITAL_REVIEW',
  REPLENISHMENT_REPAY_RETURNED_TO_APPLICANT: 'REPLENISHMENT_REPAY_RETURNED_TO_APPLICANT',
  /** 下级归仓链路只读 */
  REPLENISHMENT_REPAY_CHAIN_WATCH: 'REPLENISHMENT_REPAY_CHAIN_WATCH',
  /** 新成员资格审核（管理员）；后端 todo 枚举可先下发再接入 */
  USER_QUALIFICATION_REVIEW: 'USER_QUALIFICATION_REVIEW',
  QUALIFICATION_PENDING_REVIEW: 'QUALIFICATION_PENDING_REVIEW',
  USER_PENDING_QUALIFICATION: 'USER_PENDING_QUALIFICATION',
}

const TODO_TYPE_LABELS = {
  SETTLEMENT_PENDING_PAY: '待支付结算',
  SETTLEMENT_PENDING_REVIEW: '待审核下级结算',
  PROFIT_REPORT_PENDING_REVIEW: '待审核利润上报',
  PROFIT_REPORT_CHAIN_WATCH: '下级利润进行中',
  PROFIT_REPORT_RETURNED: '退回待修改·利润上报',
  REPLENISHMENT_PENDING_REVIEW: '待审核补仓',
  REPLENISHMENT_ADMIN_REVIEW: '待审核补仓',
  REPLENISHMENT_CAPITAL_SUBMIT: '待提交补仓凭证',
  REPLENISHMENT_APPLICANT_CONFIRM: '待确认补仓到账',
  REPLENISHMENT_CHAIN_WATCH: '下级补仓进行中',
  REPLENISHMENT_RETURNED: '退回待修改·补仓',
  REPLENISHMENT_REPAY_PENDING_REVIEW: '待我审核归仓',
  REPLENISHMENT_REPAY_RETURNED: '归仓退回待修改',
  REPLENISHMENT_REPAY_CAPITAL_REVIEW: '待我审核归仓',
  REPLENISHMENT_REPAY_RETURNED_TO_APPLICANT: '归仓退回待修改',
  REPLENISHMENT_REPAY_CHAIN_WATCH: '下级归仓进行中',
  USER_QUALIFICATION_REVIEW: '待审核资格',
  QUALIFICATION_PENDING_REVIEW: '待审核资格',
  USER_PENDING_QUALIFICATION: '待审核资格',
}

export function formatDashboardTodoType(todoType) {
  if (todoType == null || todoType === '') return '待办'
  const k = String(todoType).toUpperCase().replace(/-/g, '_')
  return TODO_TYPE_LABELS[k] || String(todoType)
}

/** 仅查看链路、无审核/提交等操作 */
export function isDashboardTodoReadOnly(item) {
  if (!item || typeof item !== 'object') return false
  if (item.readOnly === true) return true
  const t = String(item.todoType || '')
    .toUpperCase()
    .replace(/-/g, '_')
  if (t === 'PROFIT_REPORT_CHAIN_WATCH') return true
  if (t === 'REPLENISHMENT_REPAY_CHAIN_WATCH') return true
  if (t === DASHBOARD_TODO_TYPES.REPLENISHMENT_CHAIN_WATCH) return true
  return false
}

/** 流转节点 / 业务侧状态展示（字符串枚举） */
const FLOW_NODE_DISPLAY_STATUS = {
  PENDING_SUBMIT: '待提交',
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  RETURNED_FOR_EDIT: '已退回修改',
}

export function formatFlowNodeDisplayStatus(val) {
  if (val == null || val === '') return '未知状态'
  const unified = formatProfitFlowCombinedState(val)
  if (unified) return unified
  const k = String(val).toUpperCase().replace(/-/g, '_')
  if (FLOW_NODE_DISPLAY_STATUS[k] != null) return FLOW_NODE_DISPLAY_STATUS[k]
  return String(val)
}

/** 解析 todo-items 接口分页或裸数组 */
export function normalizeTodoItemsResponse(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (Array.isArray(raw.records)) return raw.records
    if (Array.isArray(raw.items)) return raw.items
    if (Array.isArray(raw.list)) return raw.list
    if (Array.isArray(raw.data)) return raw.data
  }
  return []
}

function numId(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : ''
}

/**
 * 待办项跳转路径（优先 routeHint；否则按 todoType 与 businessId 推断）。
 * @param {DashboardTodoItem} item
 * @returns {{ path: string, query?: Record<string, string> } | null}
 */
export function resolveTodoNavigation(item) {
  if (!item || typeof item !== 'object') return null
  const hint = item.routeHint
  if (typeof hint === 'string' && hint.trim() !== '') {
    const t = hint.trim()
    if (t.startsWith('http://') || t.startsWith('https://')) return { external: true, url: t }
    if (t.startsWith('/')) return { path: t }
  }

  const type = String(item.todoType || '')
    .toUpperCase()
    .replace(/-/g, '_')
  const rootFromFields = numId(
    item.rootReportId ?? item.reportId,
  )
  const businessId = numId(item.businessId)
  /** 待办 payload 显式带结算行主键时，优先走结算详情（上传划转 → POST /settlements/{id}/submit） */
  const settlementRowFromPayload = numId(
    item.settlementOrderId ?? item.settlementRowId ?? item.settlementBusinessId,
  )

  /** 利润分润链路详情：须为数字根单 id；结算类仅使用显式 root 字段，避免误把结算行 id 当根单 */
  const profitFlowTypes = new Set([
    DASHBOARD_TODO_TYPES.PROFIT_REPORT_PENDING_REVIEW,
    DASHBOARD_TODO_TYPES.PROFIT_REPORT_CHAIN_WATCH,
    DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_PAY,
    DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_REVIEW,
  ])
  if (profitFlowTypes.has(type)) {
    const rootId =
      rootFromFields ||
      (type === DASHBOARD_TODO_TYPES.PROFIT_REPORT_PENDING_REVIEW ||
      type === DASHBOARD_TODO_TYPES.PROFIT_REPORT_CHAIN_WATCH
        ? businessId
        : '')
    if (rootId) return { path: `/flow/profit/${rootId}` }
  }

  /** 管理员资格审核列表；不依赖 businessId */
  const qualificationTodoTypes = new Set([
    DASHBOARD_TODO_TYPES.USER_QUALIFICATION_REVIEW,
    DASHBOARD_TODO_TYPES.QUALIFICATION_PENDING_REVIEW,
    DASHBOARD_TODO_TYPES.USER_PENDING_QUALIFICATION,
  ])
  if (qualificationTodoTypes.has(type)) {
    return { path: '/admin/users/pending-qualification' }
  }

  /** 补仓扩展待办：部分类型无需 businessId */
  if (type === DASHBOARD_TODO_TYPES.REPLENISHMENT_ADMIN_REVIEW) {
    return { path: '/admin/replenishments/pending' }
  }
  if (type === DASHBOARD_TODO_TYPES.REPLENISHMENT_CAPITAL_SUBMIT) {
    return { path: '/replenishment/assigned' }
  }
  if (type === DASHBOARD_TODO_TYPES.REPLENISHMENT_APPLICANT_CONFIRM) {
    return { path: '/replenishment/mine' }
  }
  if (type === DASHBOARD_TODO_TYPES.REPLENISHMENT_CHAIN_WATCH) {
    if (businessId) return { path: `/replenishment/mine/${businessId}/flow` }
    return { path: '/replenishment/mine' }
  }

  /** 归仓待办：待审列表可不依赖 businessId；退回/链路无 id 时回列表 */
  if (
    type === DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_CAPITAL_REVIEW ||
    type === DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_PENDING_REVIEW
  ) {
    return { path: '/replenishment/repays/pending-review' }
  }
  if (
    type === DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_RETURNED_TO_APPLICANT ||
    type === DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_RETURNED
  ) {
    if (businessId) return { path: `/replenishment/repay/${businessId}/resubmit` }
    return { path: '/replenishment/repay-mine' }
  }
  if (type === DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_CHAIN_WATCH) {
    if (businessId) return { path: `/replenishment/repays/${businessId}/flow` }
    return { path: '/replenishment/repay-mine' }
  }

  if (
    settlementRowFromPayload &&
    (type === DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_PAY ||
      type === DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_REVIEW ||
      type === DASHBOARD_TODO_TYPES.PROFIT_REPORT_RETURNED)
  ) {
    return { path: `/settlement/row/${settlementRowFromPayload}` }
  }

  const id = businessId
  if (!id) return null

  switch (type) {
    case DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_PAY:
      return { path: '/settlement/pending-pay' }
    case DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_REVIEW:
      return { path: '/settlement/pending-review' }
    case DASHBOARD_TODO_TYPES.PROFIT_REPORT_PENDING_REVIEW:
      return { path: `/profit-report/${id}/distribution` }
    /** 同步兜底：仅 businessId 时无法区分直属退回(5)与链上待补划转，统一进待支付列表（卡片/异步解析会走正确分支） */
    case DASHBOARD_TODO_TYPES.PROFIT_REPORT_RETURNED:
      return { path: '/settlement/pending-pay', query: { status: '2' } }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_PENDING_REVIEW:
      return { path: `/replenishment/mine/${id}` }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_RETURNED:
      return { path: `/replenishment/mine/${id}/resubmit` }
    default:
      return null
  }
}

/** 待办列表「当前状态」展示（按 todoType 选格式化器） */
export function formatTodoItemCurrentStatus(item) {
  if (!item || typeof item !== 'object') return '—'
  const s = item.currentStatus
  if (s === null || s === undefined || s === '') return '—'
  const t = String(item.todoType || '')
    .toUpperCase()
    .replace(/-/g, '_')
  if (t.includes('PROFIT')) return formatProfitRecordStatus(s)
  if (t.includes('REPLENISHMENT') && t.includes('REPAY')) return formatRepayStatus(s)
  if (t.includes('REPLENISHMENT')) return formatReplenishmentStatus(s)
  if (t.includes('SETTLEMENT')) return formatSettlementStatus(s)
  if (
    t === DASHBOARD_TODO_TYPES.USER_QUALIFICATION_REVIEW ||
    t === DASHBOARD_TODO_TYPES.QUALIFICATION_PENDING_REVIEW ||
    t === DASHBOARD_TODO_TYPES.USER_PENDING_QUALIFICATION ||
    t.includes('QUALIFICATION')
  ) {
    return formatQualificationStatus(s)
  }
  return String(s)
}
