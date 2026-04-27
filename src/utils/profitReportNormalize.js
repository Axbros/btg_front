/**
 * 利润上报 VO 字段兼容：commissionMode / commissionModeDesc（新旧接口）。
 * 仅展示与透传，不参与前端业务计算。
 */

function descFromMode(mode) {
  if (mode == null || mode === '') return ''
  const s = String(mode).trim().toUpperCase().replace(/-/g, '_')
  if (s === 'GUARANTEE') return '兜底'
  if (s === 'NON_GUARANTEE') return '不兜底'
  return ''
}

/**
 * @param {unknown} item
 * @returns {unknown}
 */
export function normalizeProfitReport(item) {
  if (item == null || typeof item !== 'object' || Array.isArray(item)) {
    return item
  }
  const mode = item.commissionMode != null && item.commissionMode !== '' ? item.commissionMode : null
  const existingDesc =
    item.commissionModeDesc != null && String(item.commissionModeDesc).trim() !== ''
      ? String(item.commissionModeDesc).trim()
      : ''
  const commissionModeDesc = existingDesc || descFromMode(mode)
  return {
    ...item,
    commissionMode: mode,
    commissionModeDesc,
  }
}

/**
 * @param {unknown} raw 分页体或数组
 * @returns {unknown}
 */
export function normalizeProfitReportPage(raw) {
  if (raw == null) return raw
  if (Array.isArray(raw)) {
    return raw.map((row) => normalizeProfitReport(row))
  }
  if (typeof raw !== 'object') return raw
  const out = { ...raw }
  if (Array.isArray(out.records)) {
    out.records = out.records.map((row) => normalizeProfitReport(row))
  }
  if (Array.isArray(out.list)) {
    out.list = out.list.map((row) => normalizeProfitReport(row))
  }
  if (Array.isArray(out.profitReports)) {
    out.profitReports = out.profitReports.map((row) => normalizeProfitReport(row))
  }
  return out
}
