/**
 * 利润「直属退回重提」与「结算链上拒收后仅补划转」分支（与后端约定对齐）。
 *
 * | 条件 | 界面 / 接口 |
 * |------|-------------|
 * | report.status === RETURNED_TO_APPLICANT（或数值 5）且 currentUserId === reportUserId | 利润 resubmit 三件套 → POST /profit-reports/{id}/resubmit |
 * | report.status 为 PENDING_DIRECT_REVIEW 或 IN_SETTLEMENT_CHAIN（或数值 1 / 2），且付款人存在待支付结算 | 结算重传 → POST /settlements/{settlementRowId}/submit（body 仅 transferScreenshotUrl） |
 *
 * 不要用 lastRejectReason / 待办类型单独推断为 resubmit；须结合 status + 身份（及显式 settlementOrderId）。
 */

import { isProfitReportReturnedToApplicant } from '@/utils/format'
import { parsePageResponse } from '@/utils/pagination'

/** 利润单处于直属审核中或已进入结算链（链上拒收后利润单一般仍为 1 或 2，而非 5） */
export function isProfitInDirectReviewOrSettlementChain(status) {
  if (status === null || status === undefined || status === '') return false
  const sk = String(status)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  if (sk === 'PENDING_DIRECT_REVIEW' || sk === 'IN_SETTLEMENT_CHAIN') return true
  const n = Number(status)
  return Number.isFinite(n) && (n === 1 || n === 2)
}

export function pickProfitReportUserId(report) {
  if (!report || typeof report !== 'object') return null
  const v = report.reportUserId ?? report.userId
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 根利润单 id（与 GET /settlements/{rootReportId} 一致） */
export function pickProfitReportRootId(report, fallbackProfitReportId) {
  if (report && typeof report === 'object') {
    const v = report.id ?? report.rootReportId ?? report.reportId
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  const fb = Number(fallbackProfitReportId)
  return Number.isFinite(fb) && fb > 0 ? fb : null
}

/**
 * 仅当「直属退回申报人」且当前用户为申报人时，可走利润 resubmit。
 * @param {Record<string, unknown>} report
 * @param {number|string|null|undefined} currentUserId
 */
export function canCurrentUserUseProfitResubmitFlow(report, currentUserId) {
  if (!report || typeof report !== 'object') return false
  const me = Number(currentUserId)
  if (!Number.isFinite(me) || me <= 0) return false
  if (!isProfitReportReturnedToApplicant(report.status ?? report.statusCode)) return false
  const rid = pickProfitReportUserId(report)
  return rid != null && rid === me
}

function numId(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * 待办 / 卡片「去修改」等：在仅有 profitReportId 时拉详情与待支付列表，决定跳转 resubmit 或结算行 / 待支付列表。
 *
 * @param {{
 *   profitReportId: string|number,
 *   settlementOrderId?: string|number|null,
 *   currentUserId?: string|number|null,
 *   fetchProfitReportById: (id: number) => Promise<Record<string, unknown>>,
 *   fetchMyPendingPaySettlements: (q: Record<string, unknown>) => Promise<unknown>,
 *   pendingPayPageSize?: number,
 * }} params
 * @returns {Promise<
 *   | { kind: 'profit-resubmit'; profitReportId: number }
 *   | { kind: 'settlement-row'; rowId: number; rootReportId: number|null }
 *   | { kind: 'settlement-pending-pay'; rootReportId: number|null }
 * >}
 */
export async function resolveProfitResubmitOrSettlementTransferNavigation(params) {
  const {
    profitReportId,
    settlementOrderId,
    currentUserId,
    fetchProfitReportById,
    fetchMyPendingPaySettlements,
    pendingPayPageSize = 40,
  } = params

  const pid = numId(profitReportId)
  if (pid == null) {
    return { kind: 'settlement-pending-pay', rootReportId: null }
  }

  const explicitRow = numId(settlementOrderId)
  if (explicitRow != null) {
    return { kind: 'settlement-row', rowId: explicitRow, rootReportId: pid }
  }

  let report
  try {
    report = await fetchProfitReportById(pid)
  } catch {
    return { kind: 'settlement-pending-pay', rootReportId: pid }
  }
  if (!report || typeof report !== 'object') {
    return { kind: 'settlement-pending-pay', rootReportId: pid }
  }

  if (canCurrentUserUseProfitResubmitFlow(report, currentUserId)) {
    return { kind: 'profit-resubmit', profitReportId: pid }
  }

  if (!isProfitInDirectReviewOrSettlementChain(report.status ?? report.statusCode)) {
    return { kind: 'settlement-pending-pay', rootReportId: pickProfitReportRootId(report, pid) }
  }

  const rootId = pickProfitReportRootId(report, pid)
  try {
    const raw = await fetchMyPendingPaySettlements({
      page: 1,
      pageSize: pendingPayPageSize,
      status: 2,
    })
    const { list } = parsePageResponse(raw, pendingPayPageSize)
    const rows = Array.isArray(list) ? list : []
    const match = rows.find((r) => {
      const rr = numId(r?.rootReportId ?? r?.reportId)
      return rr != null && rootId != null && rr === rootId
    })
    if (match && numId(match.id) != null) {
      return { kind: 'settlement-row', rowId: numId(match.id), rootReportId: rootId }
    }
  } catch {
    /* 列表失败则回落列表页 */
  }

  return { kind: 'settlement-pending-pay', rootReportId: rootId }
}
