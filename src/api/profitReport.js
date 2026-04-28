import { get, post } from './request'
import { normalizeProfitReport, normalizeProfitReportPage } from '@/utils/profitReportNormalize'

/** POST /api/profit-reports — body 与后端 ProfitReportSubmitRequest 对齐 */
export function submitProfitReport(data) {
  return post('/profit-reports', data)
}

/** GET /api/profit-reports/mine — query: page、size（兼容 pageSize）；列表项经 {@link normalizeProfitReport} */
export function fetchMyProfitReports(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/profit-reports/mine', { page, size }).then((raw) => normalizeProfitReportPage(raw))
}

// GET /profit-reports/mine/seven-day-profit — 固定 7 条，字段 date、dateKey、profit，时间正序。
export function fetchMySevenDayProfit() {
  return get('/profit-reports/mine/seven-day-profit').then((data) => normalizeSevenDayProfitList(data))
}

/** @param {unknown} data 接口 data 段（数组） */
function normalizeSevenDayProfitList(data) {
  if (!Array.isArray(data)) return []
  return data.map((row) => ({
    date: row?.date != null ? String(row.date) : '',
    dateKey: row?.dateKey != null ? String(row.dateKey) : '',
    profit: (() => {
      const n = Number(row?.profit)
      return Number.isFinite(n) ? n : 0
    })(),
  }))
}

/** GET /api/profit-reports/{id} */
export function fetchProfitReportById(id) {
  return get(`/profit-reports/${id}`).then((data) => normalizeProfitReport(data))
}

/** POST /profit-reports/{id}/resubmit */
export function resubmitProfitReport(id, data) {
  return post(`/profit-reports/${id}/resubmit`, data)
}

/** GET /profit-reports/{id}/flow — 根体与嵌套 report 均归一化 commission 字段 */
export function getProfitReportFlow(id) {
  return get(`/profit-reports/${id}/flow`).then((data) => {
    if (data == null || typeof data !== 'object' || Array.isArray(data)) return data
    const next = normalizeProfitReport({ ...data })
    if (next.report && typeof next.report === 'object' && !Array.isArray(next.report)) {
      next.report = normalizeProfitReport(next.report)
    }
    return next
  })
}

/**
 * GET /profit-reports/pending-review（若后端开放；分页体与 mine 类似或含 profitReports）
 * @param {{ page?: number, size?: number, pageSize?: number }} [params]
 */
export function fetchProfitReportsPendingReview(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/profit-reports/pending-review', { page, size }).then((raw) => normalizeProfitReportPage(raw))
}
