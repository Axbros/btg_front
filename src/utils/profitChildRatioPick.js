/**
 * 直属为下级配置的利润比例：兜底 / 不兜底 两套字段 + 旧版单一 childProfitRatio 兼容。
 * 与后端 ProfitConfig / UserDetail 等 VO 上可能出现的驼峰、下划线字段对齐。
 */

const GUARANTEE_RATIO_KEYS = [
  'guaranteeRatio',
  'childProfitRatioGuarantee',
  'guaranteeChildProfitRatio',
  'childProfitRatioForGuarantee',
  'child_profit_ratio_guarantee',
  'childLineProfitRatioGuarantee',
  'child_line_profit_ratio_guarantee',
]

const NON_GUARANTEE_RATIO_KEYS = [
  'nonGuaranteeRatio',
  'childProfitRatioNonGuarantee',
  'nonGuaranteeChildProfitRatio',
  'childProfitRatioForNonGuarantee',
  'child_profit_ratio_non_guarantee',
  'childLineProfitRatioNonGuarantee',
  'child_line_profit_ratio_non_guarantee',
]

const LEGACY_RATIO_KEYS = ['childProfitRatio', 'childLineProfitRatio', 'child_profit_ratio']

function pickFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  for (const k of keys) {
    if (!(k in obj)) continue
    const n = Number(obj[k])
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 兜底场景下用户保留比例（小数 0～1）；无独立字段时回落到旧版单一比例 */
export function pickGuaranteeChildProfitRatio(obj) {
  const v = pickFiniteNumber(obj, GUARANTEE_RATIO_KEYS)
  if (v != null) return v
  return pickFiniteNumber(obj, LEGACY_RATIO_KEYS)
}

/** 不兜底场景下用户保留比例；无独立字段时回落到旧版单一比例 */
export function pickNonGuaranteeChildProfitRatio(obj) {
  const v = pickFiniteNumber(obj, NON_GUARANTEE_RATIO_KEYS)
  if (v != null) return v
  return pickFiniteNumber(obj, LEGACY_RATIO_KEYS)
}

const MAX_GUARANTEE_KEYS = [
  'maxAssignableChildGuaranteeRatio',
  'maxAssignableChildProfitRatioGuarantee',
  'maxAssignableGuaranteeChildProfitRatio',
  'max_assignable_child_profit_ratio_guarantee',
]

const MAX_NON_KEYS = [
  'maxAssignableChildNonGuaranteeRatio',
  'maxAssignableChildProfitRatioNonGuarantee',
  'maxAssignableNonGuaranteeChildProfitRatio',
  'max_assignable_child_profit_ratio_non_guarantee',
]

export function pickMaxAssignableGuarantee(obj) {
  const v = pickFiniteNumber(obj, MAX_GUARANTEE_KEYS)
  if (v != null) return v
  return pickFiniteNumber(obj, ['maxAssignableChildProfitRatio', 'max_assignable_child_profit_ratio'])
}

export function pickMaxAssignableNonGuarantee(obj) {
  const v = pickFiniteNumber(obj, MAX_NON_KEYS)
  if (v != null) return v
  return pickFiniteNumber(obj, ['maxAssignableChildProfitRatio', 'max_assignable_child_profit_ratio'])
}

/**
 * 在多个 VO 上按顺序取第一个有效值（如：分润配置行 → 用户详情根 → user）
 * @param {(Record<string, unknown>|null|undefined)[]} sources
 * @param {(o: Record<string, unknown>) => number|null} picker
 */
export function pickChildRatioAcross(sources, picker) {
  for (const s of sources) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue
    const v = picker(/** @type {Record<string, unknown>} */ (s))
    if (v != null && Number.isFinite(v)) return v
  }
  return null
}

/** @returns {'GUARANTEE'|'NON_GUARANTEE'|null} */
export function pickCommissionModeEnum(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  const m = obj.commissionMode
  if (m == null || m === '') return null
  const s = String(m).trim().toUpperCase().replace(/-/g, '_')
  if (s === 'GUARANTEE' || s === 'NON_GUARANTEE') return s
  return null
}

/** @returns {'GUARANTEE'|'NON_GUARANTEE'|null} */
export function pickCommissionModeAcross(sources) {
  for (const s of sources) {
    const v = pickCommissionModeEnum(s)
    if (v) return v
  }
  return null
}

/**
 * 结合 commissionMode 选用「用户保留」比例；无模式或未知时优先 legacy，再兜底/不兜底任一。
 * @param {Record<string, unknown>|null|undefined} c
 */
export function pickEffectiveChildProfitRatioForContext(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null
  const mode = String(c.commissionMode ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  if (mode === 'GUARANTEE') {
    const g = pickGuaranteeChildProfitRatio(c)
    if (g != null) return g
  }
  if (mode === 'NON_GUARANTEE') {
    const ng = pickNonGuaranteeChildProfitRatio(c)
    if (ng != null) return ng
  }
  const legacy = pickFiniteNumber(c, LEGACY_RATIO_KEYS)
  if (legacy != null) return legacy
  const g = pickGuaranteeChildProfitRatio(c)
  if (g != null) return g
  return pickNonGuaranteeChildProfitRatio(c)
}
