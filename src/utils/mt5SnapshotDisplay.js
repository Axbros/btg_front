import { formatDateTime, formatMoney } from '@/utils/format'

/** 不在页面展示的库表主键 / 用户主键 */
const SKIP_KEYS = new Set(['id', 'userId'])

const LABEL_ZH = {
  accountId: '交易账户',
  serverName: '服务器名称',
  balance: '余额',
  equity: '净值',
  lastBalance: '上次余额',
  lastEquity: '上次净值',
  profit: '浮动盈亏',
  marginAmount: '已用保证金',
  freeMargin: '可用保证金',
  marginLevel: '保证金比例',
  snapshotTime: '最后更新时间',
  account_id: '交易账户',
  server_name: '服务器名称',
  last_balance: '上次余额',
  last_equity: '上次净值',
  margin_amount: '已用保证金',
  free_margin: '可用保证金',
  margin_level: '保证金比例',
  snapshot_time: '最后更新时间',
}

const KEY_ORDER = [
  'accountId',
  'account_id',
  'serverName',
  'server_name',
  'balance',
  'equity',
  'lastBalance',
  'last_balance',
  'lastEquity',
  'last_equity',
  'profit',
  'marginAmount',
  'margin_amount',
  'freeMargin',
  'free_margin',
  'marginLevel',
  'margin_level',
  'snapshotTime',
  'snapshot_time',
]

function humanizeKey(key) {
  if (typeof key !== 'string') return String(key)
  const s = key.replace(/_/g, ' ')
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

const MARGIN_LEVEL_KEYS = new Set(['marginLevel', 'margin_level'])

/** 保证金比例：展示为带百分号的数值 */
function formatMarginLevelDisplay(raw) {
  if (raw === null || raw === undefined || raw === '') return '—'
  const n = Number(raw)
  if (Number.isFinite(n)) return `${formatMoney(n)}%`
  const s = String(raw).trim()
  if (!s) return '—'
  return /%$/.test(s) ? s : `${s}%`
}

function profitValueClass(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || raw === null || raw === undefined) return ''
  if (n > 0) return 'mt5-snap__num--up'
  if (n < 0) return 'mt5-snap__num--down'
  return 'mt5-snap__num--flat'
}

function formatCellValue(key, value) {
  if (MARGIN_LEVEL_KEYS.has(key)) return formatMarginLevelDisplay(value)
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatMoney(value)
  }
  if (typeof value === 'string') {
    if (key === 'snapshotTime' || key === 'snapshot_time' || /\d{4}-\d{2}-\d{2}T/.test(value)) {
      const dt = formatDateTime(value)
      return dt === '-' ? value : dt
    }
    return value
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatProfitDisplay(raw) {
  if (raw === null || raw === undefined || raw === '') return '—'
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw)
  const abs = formatMoney(Math.abs(n))
  if (n > 0) return `+${abs}`
  if (n < 0) return `-${abs}`
  return formatMoney(0)
}

/**
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @returns {Array<{ key: string, label: string, display: string, valueClass: string }>}
 */
export function mt5SnapshotDisplayRows(snapshot) {
  if (snapshot == null || typeof snapshot !== 'object' || Array.isArray(snapshot)) return []
  const keys = new Set(
    Object.keys(snapshot).filter((k) => typeof k === 'string' && k !== '' && !SKIP_KEYS.has(k)),
  )
  const ordered = []
  for (const k of KEY_ORDER) {
    if (keys.has(k)) {
      ordered.push(k)
      keys.delete(k)
    }
  }
  ordered.push(...[...keys].sort())

  return ordered.map((key) => {
    const raw = snapshot[key]
    const isProfit = key === 'profit' || key === 'floating_profit'
    return {
      key,
      label: LABEL_ZH[key] || humanizeKey(key),
      display: isProfit ? formatProfitDisplay(raw) : formatCellValue(key, raw),
      valueClass: isProfit ? profitValueClass(raw) : '',
    }
  })
}
