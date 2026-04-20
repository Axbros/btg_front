<template>
  <div class="pf-layers">
    <div v-if="chainHeadVisible" class="pf-layers__chain-head">
      <p v-if="reportUserNameText" class="pf-layers__chain-head-line">上报人：{{ reportUserNameText }}</p>
      <p v-if="reportProfitHeadLine" class="pf-layers__chain-head-line">上报利润：{{ reportProfitHeadLine }}</p>
    </div>
    <van-empty v-if="!displayLayers.length" description="暂无链路数据" />
    <ol v-else class="pf-layers__stack" aria-label="利润分润层级">
      <li
        v-for="(layer, index) in displayLayers"
        :key="profitLayerStableKey(layer, index)"
        class="pf-layers__segment"
      >
        <div
          class="pf-layers__card"
          :class="{
            'pf-layers__card--current': isCurrentLayer(layer),
            'pf-layers__card--settlement-approved': isLayerSettlementApproved(layer),
            'pf-layers__card--settlement-rejected': isLayerSettlementRejected(layer),
          }"
        >
          <!-- <div v-if="layerLevelLabel(layer)" class="pf-layers__level">{{ layerLevelLabel(layer) }}</div> -->
          <p class="pf-layers__flow">
            {{ transferDirectionLine(layer) }}<span v-if="isCurrentLayer(layer)" class="pf-layers__mark">（当前）</span>
          </p>
          <p class="pf-layers__amount">
            划转金额 {{ payAmountLine(layer) }}
            <span class="pf-layers__amount-hint">{{ payAmountComputationHint(layer) }}</span>
          </p>
          <p class="pf-layers__income">盈利金额 {{ incomeAmountLine(layer) }}</p>
          <p v-if="settlementStatusText(layer)" class="pf-layers__status">
            当前状态：{{ settlementStatusText(layer) }}
          </p>
        </div>
        <div
          v-if="index < displayLayers.length - 1"
          class="pf-layers__connector"
          aria-hidden="true"
        >
          <span class="pf-layers__connector-pole" />
          <span class="pf-layers__connector-cap">
            <svg class="pf-layers__connector-icon" viewBox="0 0 24 24" focusable="false">
              <path
                fill="currentColor"
                d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"
              />
            </svg>
          </span>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney } from '@/utils/format'
import { formatFlowStatus, formatMoneyMasked } from '@/utils/profitFlowDetailFormat'
import {
  pickLayerPayAmountToParent,
  profitLayerStableKey,
  sortProfitFlowLayersBottomFirst,
} from '@/utils/profitFlowLayer'

const ROOT_LABEL = '平台/根节点'

/** 与后端切片 VO 对齐，用于展示「profitAmount × (1 − upperRatio)」中的利润基数 */
const PROFIT_AMOUNT_FORMULA_KEYS = [
  'profitAmount',
  'ProfitAmount',
  'sliceProfitAmount',
  'layerProfitAmount',
  'reportProfitAmount',
]

function pickFirstFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== 'object') return null
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue
    const v = obj[k]
    if (v === null || v === undefined || v === '') continue
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * 比例归一化到 0～1（如 15 表示 15%，0.15 表示 15%）
 * @param {unknown} raw
 * @returns {number|null}
 */
function normalizeRatio0To1(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  if (n > 1) return n / 100
  return n
}

function trimDecimalString(n, maxFrac = 6) {
  if (!Number.isFinite(n)) return ''
  const s = n.toFixed(maxFrac).replace(/\.?0+$/, '')
  return s === '' ? '0' : s
}

const PAY_AMOUNT_EPS = 0.02

/**
 * 用具体数值说明划转额与「profitAmount × (1 − upperRatio)」的关系（字段缺失时降级文案）
 * @param {Record<string, unknown>} layer
 * @returns {string}
 */
function payAmountComputationHint(layer) {
  if (!layer || typeof layer !== 'object') return '（profitAmount × (1 − upperRatio)）'
  if (masked(layer)) {
    return '（计算：profitAmount × (1 − upperRatio)；当前视图已隐藏具体数值）'
  }
  const payRaw = pickLayerPayAmountToParent(layer)
  const pay = Number(payRaw)
  const upperRaw = layer.upperRatio
  const upper = normalizeRatio0To1(upperRaw)
  const upperStr = upper == null ? '' : trimDecimalString(upper)

  let profit = pickFirstFiniteNumber(layer, PROFIT_AMOUNT_FORMULA_KEYS)
  if (upper != null && Math.abs(1 - upper) > 1e-9 && Number.isFinite(pay)) {
    if (profit == null) profit = pay / (1 - upper)
  }

  if (upper == null) {
    if (profit != null && Number.isFinite(pay)) {
      return `（profitAmount ${formatMoney(profit)}；划转额 ${formatMoney(pay)}；未返回 upperRatio）`
    }
    return '（profitAmount × (1 − upperRatio)；未返回足够字段）'
  }

  const factor = 1 - upper
  const factorStr = trimDecimalString(factor)
  if (profit == null || !Number.isFinite(pay)) {
    return `（profitAmount × (1 − ${upperStr})；缺少利润基数或划转额）`
  }

  const product = profit * factor
  const aligned = Number.isFinite(pay) && Math.abs(product - pay) <= PAY_AMOUNT_EPS
  if (Number.isFinite(pay)) {
    if (aligned) {
      return `（${formatMoney(profit)} × (1 − ${upperStr})  = ${formatMoney(pay)}）`
    }
    return `（${formatMoney(profit)} × (1 − ${upperStr}) = ${formatMoney(product)}；接口划转额 ${formatMoney(pay)}）`
  }
  return `（${formatMoney(profit)} × (1 − ${upperStr}) = ${formatMoney(product)}）`
}

const props = defineProps({
  layers: { type: Array, default: () => [] },
  /** 利润链路 VO 顶层：上报人姓名 */
  reportUserName: { type: String, default: '' },
  /** 利润链路 VO 顶层：上报总利润 */
  reportProfitAmount: { type: [Number, String], default: null },
  /** 顶层/视图是否隐藏金额（与 VO financialsMasked 一致） */
  reportFinancialsMasked: { type: Boolean, default: false },
})

const reportUserNameText = computed(() => {
  const v = props.reportUserName
  if (v == null) return ''
  const s = String(v).trim()
  return s
})

const hasReportProfitHead = computed(() => {
  const raw = props.reportProfitAmount
  if (raw === null || raw === undefined || raw === '') return false
  const n = Number(raw)
  return Number.isFinite(n)
})

const reportProfitHeadLine = computed(() => {
  if (!hasReportProfitHead.value) return ''
  return formatMoneyMasked(props.reportProfitAmount, props.reportFinancialsMasked === true)
})

const chainHeadVisible = computed(
  () => Boolean(reportUserNameText.value) || Boolean(reportProfitHeadLine.value),
)

const displayLayers = computed(() =>
  sortProfitFlowLayersBottomFirst(
    (props.layers || []).filter((layer) => {
      const amt = layer?.payAmountToParent
      return amt !== null && amt !== undefined && String(amt) !== ''
    }),
  ),
)

function isCurrentLayer(layer) {
  if (!layer || typeof layer !== 'object') return false
  return layer.currentNode === true
}

function masked(layer) {
  return layer?.financialsMasked === true
}

function layerUserName(layer) {
  const v = layer?.userName
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
}

function layerParentName(layer) {
  const v = layer?.parentUserName
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
}

/** 有团队长用户主键则非终局审核层 */
function hasParentUserId(layer) {
  if (!layer || typeof layer !== 'object') return false
  const raw = layer.parentUserId
  if (raw === null || raw === undefined || raw === '') return false
  return String(raw).trim() !== ''
}

/** 展示用层级序号（与列表自上而下顺序一致：靠上为上一层） */
// function layerLevelLabel(layer) {
//   if (!layer || typeof layer !== 'object') return ''
//   const raw = layer.levelNo
//   if (raw === null || raw === undefined || raw === '') return ''
//   const n = Number(raw)
//   if (!Number.isFinite(n)) return ''
//   return `层级 ${n}`
// }

function transferDirectionLine(layer) {
  const from = layerUserName(layer) || '—'
  const to = layerParentName(layer) || ROOT_LABEL
  const base = `${from} → ${to}`
  if (!hasParentUserId(layer)) {
    return `${base}（最终步骤）`
  }
  return base
}

function payAmountLine(layer) {
  return formatMoneyMasked(pickLayerPayAmountToParent(layer), masked(layer))
}

const INCOME_AMOUNT_KEYS = ['incomeAmount', 'IncomeAmount']

function pickLayerIncomeAmount(layer) {
  if (!layer || typeof layer !== 'object') return undefined
  for (const k of INCOME_AMOUNT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(layer, k)) continue
    const v = layer[k]
    if (v !== null && v !== undefined && v !== '') return v
  }
  return undefined
}

function incomeAmountLine(layer) {
  return formatMoneyMasked(pickLayerIncomeAmount(layer), masked(layer))
}

function settlementStatus(layer) {
  if (!layer || typeof layer !== 'object') return ''
  const s = layer.settlementStatus
  return s != null && String(s).trim() !== '' ? String(s).trim() : ''
}

/** settlementStatus 为 APPROVED 时卡片使用绿色背景（大小写、连字符兼容） */
function isLayerSettlementApproved(layer) {
  const raw = settlementStatus(layer)
  if (!raw) return false
  const k = raw.toUpperCase().replace(/-/g, '_')
  return k === 'APPROVED'
}

/** settlementStatus 为 REJECTED 时卡片使用红色背景 */
function isLayerSettlementRejected(layer) {
  const raw = settlementStatus(layer)
  if (!raw) return false
  const k = raw.toUpperCase().replace(/-/g, '_')
  return k === 'REJECTED'
}

function settlementStatusText(layer) {
  const s = settlementStatus(layer)
  return s ? formatFlowStatus(s) : ''
}
</script>

<style scoped>
.pf-layers {
  padding: 8px 14px 16px;
}
.pf-layers__chain-head {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f0f4ff 0%, #e8eefc 100%);
  border: 1px solid #d6def0;
  font-size: 14px;
  line-height: 1.55;
  color: #323233;
}
.pf-layers__chain-head-line {
  margin: 0;
}
.pf-layers__chain-head-line + .pf-layers__chain-head-line {
  margin-top: 6px;
}
.pf-layers__stack {
  margin: 0;
  padding: 0;
  list-style: none;
}
.pf-layers__segment {
  margin: 0;
  padding: 0;
}
.pf-layers__card {
  position: relative;
  padding: 14px 14px 14px 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #f3f4f6 100%);
  border: 1px solid #e8eaed;
  font-size: 15px;
  line-height: 1.55;
  color: #323233;
}
.pf-layers__card--settlement-approved {
  background: linear-gradient(180deg, #f0faf3 0%, #e4f5ea 100%);
  border-color: #c5e8cf;
}
.pf-layers__card--settlement-approved .pf-layers__mark {
  color: #07c160;
}
.pf-layers__card--settlement-rejected {
  background: linear-gradient(180deg, #fff8f8 0%, #fdeeee 100%);
  border-color: #f5c2c7;
}
.pf-layers__card--settlement-rejected .pf-layers__mark {
  color: #ee0a24;
}
.pf-layers__card--current {
  border-color: rgba(237, 106, 12, 0.45);
  background: linear-gradient(180deg, #fffaf5 0%, #fff3e8 100%);
}
.pf-layers__card--settlement-approved.pf-layers__card--current {
  border-color: rgba(7, 193, 96, 0.42);
  background: linear-gradient(180deg, #f5fff8 0%, #e8f9ec 100%);
}
.pf-layers__card--current::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #ed6a0c;
}
.pf-layers__card--settlement-approved.pf-layers__card--current::before {
  background: #07c160;
}
.pf-layers__card--settlement-rejected.pf-layers__card--current {
  border-color: rgba(238, 10, 36, 0.42);
  background: linear-gradient(180deg, #fff5f5 0%, #ffe8ea 100%);
}
.pf-layers__card--settlement-rejected.pf-layers__card--current::before {
  background: #ee0a24;
}
.pf-layers__level {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #969799;
  text-transform: none;
}
.pf-layers__card--current .pf-layers__level {
  color: #c44f09;
}
.pf-layers__flow {
  margin: 0 0 8px;
  font-weight: 600;
}
.pf-layers__card--current .pf-layers__flow {
  color: #c44f09;
}
.pf-layers__card--settlement-approved.pf-layers__card--current .pf-layers__flow {
  color: #059a4c;
}
.pf-layers__card--settlement-approved.pf-layers__card--current .pf-layers__level {
  color: #3d9e62;
}
.pf-layers__card--settlement-rejected.pf-layers__card--current .pf-layers__flow {
  color: #c4151f;
}
.pf-layers__card--settlement-rejected.pf-layers__card--current .pf-layers__level {
  color: #c4151f;
}
.pf-layers__mark {
  font-weight: 600;
  color: #ed6a0c;
}
.pf-layers__amount {
  margin: 0;
  font-size: 14px;
  color: #323233;
}
.pf-layers__amount-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  color: #969799;
}
.pf-layers__income {
  margin: 10px 0 0;
  font-size: 14px;
  color: #323233;
}
.pf-layers__status {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px dashed #e1e3e6;
  font-size: 13px;
  color: #646566;
}
.pf-layers__connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0 14px;
  user-select: none;
}
.pf-layers__connector-pole {
  width: 3px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(237, 106, 12, 0.35) 0%,
    rgba(237, 106, 12, 0.12) 45%,
    rgba(150, 151, 153, 0.45) 100%
  );
}
.pf-layers__connector-cap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-top: -4px;
  border-radius: 50%;
  color: #d9650a;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
  border: 1px solid rgba(237, 106, 12, 0.22);
}
.pf-layers__connector-icon {
  width: 18px;
  height: 18px;
  display: block;
  opacity: 0.92;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.9));
}
</style>
