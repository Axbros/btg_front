import { formatMoney, formatProfitRecordStatus, formatSettlementStatus } from '@/utils/format'

/**
 * GET /settlements/{rootReportId}/profit-flow 仅返回 layers（ProfitFlowLayerSummaryVO[]）。
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {Record<string, unknown>[]}
 */
export function pickProfitFlowLayers(payload) {
  if (!payload || typeof payload !== 'object') return []
  const raw = payload.layers ?? payload.Layers
  return Array.isArray(raw) ? raw : []
}

export function getProfitFlowLayerType(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const t = layer.layerType ?? layer.layer_type ?? layer.type ?? layer.kind
  return t != null ? String(t).trim().toUpperCase().replace(/-/g, '_') : ''
}

export function isDirectProfitReviewLayer(layer) {
  return getProfitFlowLayerType(layer) === 'DIRECT_PROFIT_REVIEW'
}

export function pickProfitFlowLayerState(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const s = layer.state ?? layer.status ?? layer.layerState ?? layer.layer_state
  return s != null ? String(s).trim() : ''
}

function normState(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
}

/** 该层是否已终局（通过 / 拒绝 / 利润完结等），用于步骤条 active */
export function isProfitFlowLayerTerminal(layer) {
  const sk = normState(pickProfitFlowLayerState(layer))
  if (!sk) return false
  if (
    [
      'APPROVED',
      'PASSED',
      'CONFIRMED',
      'REJECTED',
      'ALL_COMPLETED',
      'IN_SETTLEMENT_CHAIN',
      'PROFIT_REJECTED',
    ].includes(sk)
  ) {
    return true
  }
  if (sk === 'RETURNED_TO_APPLICANT' || sk === 'RETURNED_FOR_EDIT') return false
  if (sk.startsWith('PENDING')) return false
  return false
}

/**
 * 展示文案：直审层用利润侧语义，其余按结算单语义。
 * @param {Record<string, unknown>} layer
 */
export function formatProfitFlowLayerStateLabel(layer) {
  if (!layer || typeof layer !== 'object') return '—'
  const st = pickProfitFlowLayerState(layer)
  if (!st) return '—'
  const sk = normState(st)
  if (isDirectProfitReviewLayer(layer)) {
    const directMap = {
      PENDING_DIRECT_REVIEW: '待审',
      PENDING_REVIEW: '待审',
      RETURNED_TO_APPLICANT: '退回',
      RETURNED_FOR_EDIT: '退回',
      REJECTED: '利润拒绝',
      PROFIT_REJECTED: '利润拒绝',
      ALL_COMPLETED: '已通过',
      IN_SETTLEMENT_CHAIN: '已进入结算链',
    }
    if (directMap[sk]) return directMap[sk]
    return formatProfitRecordStatus(st)
  }
  return formatSettlementStatus(st)
}

function pickNick(layer, side) {
  if (!layer || typeof layer !== 'object') return ''
  if (side === 'from') {
    return (
      trim(layer.fromUserNickname) ||
      trim(layer.from_user_nickname) ||
      trim(layer.fromNickname) ||
      trim(layer.from_nickname)
    )
  }
  return (
    trim(layer.toUserNickname) ||
    trim(layer.to_user_nickname) ||
    trim(layer.toNickname) ||
    trim(layer.to_nickname)
  )
}

function trim(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

function trunc(s, max) {
  if (!s) return ''
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

/** 横向步骤条短标题 */
export function profitFlowLayerStepTitle(layer, index) {
  if (!layer || typeof layer !== 'object') return `层${index + 1}`
  if (isDirectProfitReviewLayer(layer)) {
    return '直审'
  }
  const from = pickNick(layer, 'from')
  const to = pickNick(layer, 'to')
  if (from || to) {
    return `${trunc(from, 4)}→${trunc(to, 4)}`
  }
  return `结算${index}`
}

/** 第一个未完成层的下标；若全部完成则指向最后一层 */
export function computeProfitFlowActiveLayerIndex(layers) {
  if (!Array.isArray(layers) || !layers.length) return 0
  const idx = layers.findIndex((l) => !isProfitFlowLayerTerminal(l))
  if (idx >= 0) return idx
  return layers.length - 1
}

export function pickProfitFlowLayerPayAmount(layer) {
  if (!layer || typeof layer !== 'object') return null
  const v = layer.payAmount ?? layer.pay_amount
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function formatProfitFlowLayerSubtitle(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const parts = []
  parts.push(formatProfitFlowLayerStateLabel(layer))
  if (!isDirectProfitReviewLayer(layer)) {
    const amt = pickProfitFlowLayerPayAmount(layer)
    if (amt != null) parts.push(formatMoney(amt))
  }
  return parts.filter(Boolean).join(' · ')
}

/** 列表副标题：付款人 → 收款人、金额（结算边） */
export function formatProfitFlowLayerDetailLabel(layer) {
  if (!layer || typeof layer !== 'object') return ''
  if (isDirectProfitReviewLayer(layer)) {
    return '申报人 → 直属上级'
  }
  const from = pickNick(layer, 'from')
  const to = pickNick(layer, 'to')
  const parts = []
  if (from || to) parts.push(`${from || '—'} → ${to || '—'}`)
  const amt = pickProfitFlowLayerPayAmount(layer)
  if (amt != null) parts.push(`应支付 ${formatMoney(amt)}`)
  return parts.join('\n')
}

/**
 * 将 profit-flow 的 layers 转为 {@link BusinessFlowNodesStepper} 所需节点结构（竖轴）。
 * @param {Record<string, unknown>[]} layers
 */
export function mapProfitFlowLayersToStepperNodes(layers) {
  if (!Array.isArray(layers) || !layers.length) return []
  return layers.map((layer) => {
    if (!layer || typeof layer !== 'object') return {}
    const direct = isDirectProfitReviewLayer(layer)
    const stLabel = formatProfitFlowLayerStateLabel(layer)
    const amt = pickProfitFlowLayerPayAmount(layer)
    let fromTo = ''
    if (!direct) {
      const from = pickNick(layer, 'from')
      const to = pickNick(layer, 'to')
      if (from || to) fromTo = `${from || '—'} → ${to || '—'}`
    }
    return {
      nodeName: direct ? '利润直审' : fromTo || '结算边',
      nodeRole: '',
      displayStatus: stLabel,
      remark: direct ? '申报人 → 直属上级' : amt != null ? `应支付 ${formatMoney(amt)}` : '',
      operateTime: layer.updatedAt ?? layer.updated_at ?? layer.submitTime ?? layer.submit_time ?? null,
    }
  })
}
