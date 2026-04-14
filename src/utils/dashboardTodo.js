/**
 * 首页待办 / 流转展示：todoType、节点状态文案与跳转路径（与后端约定一致）。
 */
import {
  formatProfitRecordStatus,
  formatReplenishmentStatus,
  formatRepayStatus,
  formatSettlementStatus,
} from '@/utils/format'

/** @typedef {{ todoType?: string, businessId?: string|number, routeHint?: string, currentStatus?: unknown }} DashboardTodoItem */

export const DASHBOARD_TODO_TYPES = {
  SETTLEMENT_PENDING_PAY: 'SETTLEMENT_PENDING_PAY',
  SETTLEMENT_PENDING_REVIEW: 'SETTLEMENT_PENDING_REVIEW',
  PROFIT_REPORT_PENDING_REVIEW: 'PROFIT_REPORT_PENDING_REVIEW',
  PROFIT_REPORT_RETURNED: 'PROFIT_REPORT_RETURNED',
  REPLENISHMENT_PENDING_REVIEW: 'REPLENISHMENT_PENDING_REVIEW',
  REPLENISHMENT_RETURNED: 'REPLENISHMENT_RETURNED',
  REPLENISHMENT_REPAY_PENDING_REVIEW: 'REPLENISHMENT_REPAY_PENDING_REVIEW',
  REPLENISHMENT_REPAY_RETURNED: 'REPLENISHMENT_REPAY_RETURNED',
}

const TODO_TYPE_LABELS = {
  SETTLEMENT_PENDING_PAY: '待支付结算',
  SETTLEMENT_PENDING_REVIEW: '待审核下级结算',
  PROFIT_REPORT_PENDING_REVIEW: '待审核利润上报',
  PROFIT_REPORT_RETURNED: '退回待修改·利润上报',
  REPLENISHMENT_PENDING_REVIEW: '待审核补仓',
  REPLENISHMENT_RETURNED: '退回待修改·补仓',
  REPLENISHMENT_REPAY_PENDING_REVIEW: '待审核归仓',
  REPLENISHMENT_REPAY_RETURNED: '退回待修改·归仓',
}

export function formatDashboardTodoType(todoType) {
  if (todoType == null || todoType === '') return '待办'
  const k = String(todoType).toUpperCase()
  return TODO_TYPE_LABELS[k] || String(todoType)
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

  const type = String(item.todoType || '').toUpperCase()
  const id = numId(item.businessId)
  if (!id) return null

  switch (type) {
    case DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_PAY:
      return { path: '/settlement/pending-pay' }
    case DASHBOARD_TODO_TYPES.SETTLEMENT_PENDING_REVIEW:
      return { path: '/settlement/pending-review' }
    case DASHBOARD_TODO_TYPES.PROFIT_REPORT_PENDING_REVIEW:
      return { path: `/profit-report/${id}/distribution` }
    case DASHBOARD_TODO_TYPES.PROFIT_REPORT_RETURNED:
      return { path: `/profit-report/${id}/resubmit` }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_PENDING_REVIEW:
      return { path: `/replenishment/mine/${id}` }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_RETURNED:
      return { path: `/replenishment/mine/${id}/resubmit` }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_PENDING_REVIEW:
      return { path: `/replenishment/repay/${id}` }
    case DASHBOARD_TODO_TYPES.REPLENISHMENT_REPAY_RETURNED:
      return { path: `/replenishment/repay/${id}/resubmit` }
    default:
      return null
  }
}

/** 待办列表「当前状态」展示（按 todoType 选格式化器） */
export function formatTodoItemCurrentStatus(item) {
  if (!item || typeof item !== 'object') return '—'
  const s = item.currentStatus
  if (s === null || s === undefined || s === '') return '—'
  const t = String(item.todoType || '').toUpperCase()
  if (t.includes('PROFIT')) return formatProfitRecordStatus(s)
  if (t.includes('REPLENISHMENT') && t.includes('REPAY')) return formatRepayStatus(s)
  if (t.includes('REPLENISHMENT')) return formatReplenishmentStatus(s)
  if (t.includes('SETTLEMENT')) return formatSettlementStatus(s)
  return String(s)
}
