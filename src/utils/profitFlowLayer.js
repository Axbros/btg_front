import {
  formatMoney,
  formatProfitFlowCombinedState,
  formatProfitRecordStatus,
  formatSettlementStatus,
} from '@/utils/format'
import {
  formatFlowStatus,
  formatMoneyMasked,
  formatRateMasked,
} from '@/utils/profitFlowDetailFormat'

function layerArrayLength(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 0
  const L = p.layers ?? p.Layers
  return Array.isArray(L) ? L.length : 0
}

/**
 * 兼容 HTTP body 多包一层 {@code data}/{@code result}，或 layers 在内层更完整的情况。
 *
 * 典型后端体（与 {@code GET /settlements/{id}/profit-flow} 一致）：
 * `{ code, message, data: { reportId, reportNo, layers: [...] } }`。
 * 请求层拦截器通常已剥到 {@code data}，本层收到的是
 * `{ reportId, reportNo, layers, currentFlowStatus, ... }`；
 * 若仍收到整包，则沿 {@code data}/{@code result} 下钻直到出现非空 {@code layers} 数组。
 *
 * @param {unknown} raw
 * @returns {Record<string, unknown>|null}
 */
export function unwrapProfitFlowDetailPayload(raw) {
  if (raw == null) return null
  if (Array.isArray(raw)) return { layers: raw }
  if (typeof raw !== 'object') return null
  let p = /** @type {Record<string, unknown>} */ (raw)
  /**
   * 沿 data/result 多包一层时，中间对象往往没有 layers，旧逻辑用「内层条数 > 外层」才下钻，
   * 会遇到 0 > 0 提前退出，永远读不到 { data: { data: { layers }}} 里的数组。
   */
  for (let i = 0; i < 6; i++) {
    if (layerArrayLength(p) > 0) return p
    const next =
      (p.data && typeof p.data === 'object' && !Array.isArray(p.data) ? p.data : null) ??
      (p.result && typeof p.result === 'object' && !Array.isArray(p.result) ? p.result : null)
    if (!next) break
    p = /** @type {Record<string, unknown>} */ (next)
  }
  return p
}

/**
 * 从利润链路 VO 取出 {@code layers} 数组。
 *
 * 与线上 VO 对齐：{@code layers[i]} 含 {@code levelNo}、{@code userName}、{@code parentUserName}（可选）、
 * {@code payAmountToParent}（levelNo=0 顶层切片常无此字段）、{@code profitAmount}、{@code upperRatio}、
 * {@code incomeAmount}（盈利金额）、{@code settlementStatus}、{@code currentNode} 等。
 *
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {Record<string, unknown>[]}
 */
export function pickProfitFlowLayers(payload) {
  const base = unwrapProfitFlowDetailPayload(payload) ?? payload

  if (!base || typeof base !== 'object' || Array.isArray(base)) {
    return []
  }

  const candidates = [
    base.layers,
    base.Layers,
    base.layerList,
    base.layer_list,
    base.profitFlowLayers,
    base.profit_flow_layers,
  ]

  for (const raw of candidates) {
    if (Array.isArray(raw)) {
      return raw
    }

    if (typeof raw === 'string') {
      const t = raw.trim()
      if (t.startsWith('[')) {
        try {
          const parsed = JSON.parse(t)
          if (Array.isArray(parsed)) {
            return parsed
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return []
}

const PAY_TO_PARENT_KEYS = ['payAmountToParent', 'pay_amount_to_parent', 'PayAmountToParent']

/**
 * 读取「向上级划转金额」；levelNo=0 等顶层常不带该字段 → undefined（与 0 区分）。
 * @param {Record<string, unknown>|null|undefined} layer
 * @returns {unknown}
 */
export function pickLayerPayAmountToParent(layer) {
  if (!layer || typeof layer !== 'object') return undefined
  for (const k of PAY_TO_PARENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(layer, k)) continue
    const v = layer[k]
    if (v !== null && v !== undefined && v !== '') return v
  }
  return undefined
}

/** 有「向上级」语义的一层：含上级姓名，或非零 payAmountToParent（排除仅顶层切片、无 parent 的层） */
export function isPayToParentProfitFlowLayer(layer) {
  if (!layer || typeof layer !== 'object') return false
  const parent = layer.parentUserName ?? layer.parent_user_name
  if (parent != null && String(parent).trim() !== '') return true
  const pay = pickLayerPayAmountToParent(layer)
  if (pay == null || pay === '') return false
  const n = Number(pay)
  return Number.isFinite(n) && n !== 0
}

/**
 * 分润链卡片：按 levelNo 从大到小排序；不做权限/语义裁剪（由后端控制可见 layers）。
 * @param {Record<string, unknown>[]} layers
 * @returns {Record<string, unknown>[]}
 */
export function sortProfitFlowLayersBottomFirst(layers) {
  if (!Array.isArray(layers) || !layers.length) return []
  const copy = [...layers]
  copy.sort((a, b) => {
    const la = Number(a?.levelNo ?? a?.level_no ?? -1)
    const lb = Number(b?.levelNo ?? b?.level_no ?? -1)
    const na = Number.isFinite(la) ? la : -1
    const nb = Number.isFinite(lb) ? lb : -1
    return nb - na
  })
  return copy
}

export function getProfitFlowLayerType(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const t = layer.layerType ?? layer.layer_type ?? layer.type ?? layer.kind
  return t != null ? String(t).trim().toUpperCase().replace(/-/g, '_') : ''
}

export function isDirectProfitReviewLayer(layer) {
  return getProfitFlowLayerType(layer) === 'DIRECT_PROFIT_REVIEW'
}

/** 后端「总利润切片」链路层（含 settlementStatus、levelNo、userName 等） */
export function isSliceModelProfitFlowLayer(layer) {
  if (!layer || typeof layer !== 'object') return false
  const st = layer.settlementStatus ?? layer.settlement_status
  if (st == null || String(st).trim() === '') return false
  const hasUserOrLevel =
    (layer.userName ?? layer.user_name) != null ||
    (layer.levelNo ?? layer.level_no) != null
  return hasUserOrLevel
}

/**
 * 切片链路：levelNo 越小越靠上（与结算详情竖向步骤一致）。
 * @param {Record<string, unknown>[]} layers
 * @returns {Record<string, unknown>[]}
 */
export function sortProfitFlowLayersForDisplay(layers) {
  if (!Array.isArray(layers) || !layers.length) return []
  const copy = [...layers]
  const hasSliceLevel = copy.some(
    (l) => l && isSliceModelProfitFlowLayer(l) && (l.levelNo != null || l.level_no != null),
  )
  if (!hasSliceLevel) return copy
  return copy.sort((a, b) => {
    const la = Number(a?.levelNo ?? a?.level_no ?? 1e9)
    const lb = Number(b?.levelNo ?? b?.level_no ?? 1e9)
    const na = Number.isFinite(la) ? la : 1e9
    const nb = Number.isFinite(lb) ? lb : 1e9
    return na - nb
  })
}

/**
 * @param {Record<string, unknown>} layer
 * @param {number} index
 * @returns {string}
 */
export function profitLayerStableKey(layer, index) {
  if (!layer || typeof layer !== 'object') return `layer-fallback-${index}`
  const lvl = layer.levelNo ?? layer.level_no ?? 'x'
  const uid = layer.userId ?? layer.user_id ?? 'u'
  return `layer-${lvl}-${uid}-${index}`
}

export function pickProfitFlowLayerState(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const ss = layer.settlementStatus ?? layer.settlement_status
  if (ss != null && String(ss).trim() !== '') return String(ss).trim()
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
  if (sk === 'NONE' || sk === 'FLOW_FINISHED') return true
  if (
    [
      'APPROVED',
      'PASSED',
      'CONFIRMED',
      'REJECTED',
      'ALL_COMPLETED',
      'IN_SETTLEMENT_CHAIN',
      'PROFIT_REJECTED',
      'DIRECT_REVIEW_PASSED',
      'SETTLEMENT_APPROVED',
      'SETTLEMENT_REJECTED',
    ].includes(sk)
  ) {
    return true
  }
  if (sk === 'RETURNED_TO_APPLICANT' || sk === 'RETURNED_FOR_EDIT') return false
  if (sk === 'SETTLEMENT_NOT_STARTED') return false
  if (sk.startsWith('PENDING') || sk.startsWith('SETTLEMENT_PENDING')) return false
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
  if (isSliceModelProfitFlowLayer(layer)) {
    return formatFlowStatus(st)
  }
  const unified = formatProfitFlowCombinedState(st)
  if (unified) return unified
  if (isDirectProfitReviewLayer(layer)) {
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
  if (isSliceModelProfitFlowLayer(layer)) {
    const levelNo = layer.levelNo ?? layer.level_no ?? index
    const userName = trim(layer.userName ?? layer.user_name)
    const parentName = trim(layer.parentUserName ?? layer.parent_user_name)
    const masked = layer.financialsMasked === true || layer.financials_masked === true
    const payStr = formatMoneyMasked(
      layer.payAmountToParent ?? layer.pay_amount_to_parent,
      masked,
    )
    const upperStr = formatRateMasked(layer.upperRatio ?? layer.upper_ratio, masked)
    if (!parentName) {
      const prefix = `L${levelNo}`
      return userName ? `${prefix}·${trunc(userName, 6)}` : prefix
    }
    if (userName && parentName) {
      return `${trunc(userName, 6)}→${trunc(parentName, 6)}(${payStr},${upperStr})`
    }
    const prefix = levelNo != null && levelNo !== '' ? `L${levelNo}` : `L${index}`
    return userName ? `${prefix}·${trunc(userName, 6)}` : prefix
  }
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
  const byFlag = layers.findIndex(
    (l) => l && (l.currentNode === true || l.current_node === true),
  )
  if (byFlag >= 0) return byFlag
  const idx = layers.findIndex((l) => !isProfitFlowLayerTerminal(l))
  if (idx >= 0) return idx
  return layers.length - 1
}

export function pickProfitFlowLayerPayAmount(layer) {
  if (!layer || typeof layer !== 'object') return null
  const v =
    layer.payAmount ??
    layer.pay_amount ??
    layer.payAmountToParent ??
    layer.pay_amount_to_parent
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
  if (isSliceModelProfitFlowLayer(layer)) {
    const user = trim(layer.userName ?? layer.user_name)
    const parent = trim(layer.parentUserName ?? layer.parent_user_name)
    const masked = layer.financialsMasked === true || layer.financials_masked === true
    const payStr = formatMoneyMasked(
      layer.payAmountToParent ?? layer.pay_amount_to_parent,
      masked,
    )
    const upperStr = formatRateMasked(layer.upperRatio ?? layer.upper_ratio, masked)
    if (!parent) {
      const child = trim(layer.childUserName ?? layer.child_user_name)
      return child ? `根层 ${user || '—'}（下级：${child}）` : `根层 ${user || '—'}`
    }
    if (user && parent) return `${user} → ${parent} (${payStr}, ${upperStr})`
    if (user) return user
    return `第${layer.levelNo ?? layer.level_no ?? ''}层`
  }
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
 * 将 profit-flow 的 layers 转为时间线节点结构（竖轴）；切片层级请用 ProfitLayerList 展示。
 * @param {Record<string, unknown>[]} layers
 */
export function mapProfitFlowLayersToStepperNodes(layers) {
  if (!Array.isArray(layers) || !layers.length) return []
  const sliceLevels = layers
    .filter(isSliceModelProfitFlowLayer)
    .map((l) => Number(l.levelNo ?? l.level_no))
    .filter((n) => Number.isFinite(n))
  const minSliceLevel = sliceLevels.length ? Math.min(...sliceLevels) : 0

  return layers.map((layer, index) => {
    if (!layer || typeof layer !== 'object') return {}
    const stLabel = formatProfitFlowLayerStateLabel(layer)
    if (isSliceModelProfitFlowLayer(layer)) {
      const levelNo = layer.levelNo ?? layer.level_no ?? index
      const lvl = Number(levelNo)
      const userName = trim(layer.userName ?? layer.user_name)
      const parentName = trim(layer.parentUserName ?? layer.parent_user_name)
      const masked = layer.financialsMasked === true || layer.financials_masked === true
      const payStr = formatMoneyMasked(
        layer.payAmountToParent ?? layer.pay_amount_to_parent,
        masked,
      )
      const upperStr = formatRateMasked(layer.upperRatio ?? layer.upper_ratio, masked)
      const isTop = Number.isFinite(lvl) && lvl === minSliceLevel
      const child = trim(layer.childUserName ?? layer.child_user_name)
      if (isTop) {
        return {
          nodeName: `第${levelNo}层·${userName || '—'}`,
          nodeRole: '',
          displayStatus: stLabel,
          remark: child ? `下级：${child}` : '',
          operateTime:
            layer.operateTime ??
            layer.operate_time ??
            layer.updatedAt ??
            layer.updated_at ??
            layer.submitTime ??
            layer.submit_time ??
            null,
        }
      }
      const nodeName = parentName
        ? `${userName || '—'} → ${parentName} (${payStr}, ${upperStr})`
        : `${userName || '—'} (${payStr}, ${upperStr})`
      return {
        nodeName,
        nodeRole: '',
        displayStatus: stLabel,
        remark: '',
        operateTime:
          layer.operateTime ??
          layer.operate_time ??
          layer.updatedAt ??
          layer.updated_at ??
          layer.submitTime ??
          layer.submit_time ??
          null,
      }
    }
    const direct = isDirectProfitReviewLayer(layer)
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
      /** 竖轴备注：state 枚举对应中文（与 formatProfitFlowLayerStateLabel 一致） */
      remark: stLabel && stLabel !== '—' ? stLabel : '',
      operateTime: layer.updatedAt ?? layer.updated_at ?? layer.submitTime ?? layer.submit_time ?? null,
    }
  })
}
