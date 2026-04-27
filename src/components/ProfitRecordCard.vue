<template>
  <van-cell-group
    inset
    class="profit-card"
    :class="{ 'profit-card--clickable': linkToSettlement }"
    @click="onCardClick"
  >
    <van-cell :is-link="linkToSettlement">
      <template #title>
        <span class="profit-card__title">{{ orderNo }}</span>
        <span class="mode-tag">{{ commissionModeTagText }}</span>
      </template>
      <template #value>
        <van-tag :type="profitRecordStatusTagType(item.status)" plain round>
          {{ statusText }}
        </van-tag>
      </template>
    </van-cell>
    <van-cell title="上报利润">
      <template #value>
        <span class="profit-card__amount">{{ formatMoney(item.profitAmount) }}</span>
      </template>
    </van-cell>
    <!-- <van-cell title="用户利润比例" :value="formatRate(ratioField)" /> -->
    <!-- <van-cell title="自留分润" :value="formatMoney(netField)" /> -->
    <!-- <van-cell title="链路团队长计提" :value="formatMoney(shareUpField)" /> -->
    <!-- <van-cell title="提交时间" :value="formatDateTime(item.submitTime)" /> -->
    <van-cell v-if="item.auditTime" title="审核时间" :value="formatDateTime(item.auditTime)" />
    <van-cell v-if="item.auditRemark" title="审核备注" :label="item.auditRemark" />
    <van-cell
      v-if="canShowDistributionLink"
      title="分润明细"
      is-link
      @click.stop="goDistribution"
    />
    <!-- <van-cell
      v-if="profitFlowRootId != null"
      title="查看利润分润链路"
      is-link
      @click.stop="goProfitFlowDetail"
    /> -->
    <!-- <template v-if="showReturnedOrSettlementPayActions">
      <van-cell :title="resubmitActionTitle" is-link @click.stop="goProfitResubmitOrSettlement" />
      <van-cell title="查看状态流" is-link @click.stop="goProfitFlow" />
    </template> -->
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  formatMoney,
  formatDateTime,
  formatRate,
  formatProfitRecordStatus,
  profitRecordStatusTagType,
  isProfitReportReturnedToApplicant,
} from '@/utils/format'
import { resolveProfitResubmitOrSettlementTransferNavigation } from '@/utils/profitReportSettlementBranch'
import { fetchProfitReportById } from '@/api/profitReport'
import { fetchMyPendingPaySettlements } from '@/api/settlement'

const props = defineProps({
  item: { type: Object, required: true },
  showDistributionLink: { type: Boolean, default: false },
  /** 为 true 时（如「利润记录」）点击卡片跳结算详情；路由 id 为 root_report_id（与利润单 id 一致） */
  linkToSettlement: { type: Boolean, default: false },
})

const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

/** 仅根用户可查看整条链路分润明细（与后端 isRoot 一致） */
const isRootUser = computed(() => {
  const u = userInfo.value
  if (!u) return false
  const v = u.isRoot
  if (v === true || v === 1 || v === '1') return true
  if (v === false || v === 0 || v === '0') return false
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true
  return false
})

const canShowDistributionLink = computed(() => {
  if (!props.showDistributionLink || !isRootUser.value) return false
  const v = profitReportIdForDistribution()
  return v != null && String(v).trim() !== ''
})

/** 直属退回(5)：改利润三件套；链上待补划转(1/2)：去结算上传凭证（由跳转解析） */
const showReturnedOrSettlementPayActions = computed(() => {
  const s = props.item.status ?? props.item.statusCode
  if (isProfitReportReturnedToApplicant(s)) return true
  const sk = String(s ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
  if (sk === 'PENDING_DIRECT_REVIEW' || sk === 'IN_SETTLEMENT_CHAIN') return true
  const n = Number(s)
  return Number.isFinite(n) && (n === 1 || n === 2)
})

const resubmitActionTitle = computed(() =>
  isProfitReportReturnedToApplicant(props.item.status ?? props.item.statusCode)
    ? '去修改并重提'
    : '去上传划转凭证',
)

/** 与结算详情 GET /settlements/{rootReportId} 一致：根单 id */
const profitFlowRootId = computed(() => {
  const it = props.item
  const root = it.reportId ?? it.rootReportId ?? it.id
  if (root == null || String(root).trim() === '') return null
  const n = Number(root)
  return Number.isFinite(n) && n > 0 ? n : null
})

const orderNo = computed(
  () =>
    props.item.reportNo ??
    props.item.recordNo ??
    (props.item.id != null ? `#${props.item.id}` : '—'),
)

/** 仅展示；旧数据无字段时显示「-」 */
const commissionModeTagText = computed(() => {
  const t = String(props.item.commissionModeDesc ?? '').trim()
  return t || '-'
})

const statusText = computed(() => formatProfitRecordStatus(props.item.status))

const ratioField = computed(
  () => props.item.childProfitRatio ?? props.item.commissionRate ?? props.item.rate,
)

const netField = computed(
  () => props.item.netAmount ?? props.item.netProfit ?? props.item.retainedAmount ?? props.item.selfAmount,
)

const shareUpField = computed(
  () =>
    props.item.commissionAmount ??
    props.item.shouldAmount ??
    props.item.upstreamShareAmount ??
    props.item.payableToSuperiorAmount,
)

/** 付款人打开详情：GET /settlements/{rootReportId}；root_report_id 与本次上报利润单 id 一致 */
function goSettlement() {
  const it = props.item
  const root = it.reportId ?? it.rootReportId ?? it.id
  if (root != null && String(root).trim() !== '') {
    const n = Number(root)
    if (Number.isFinite(n) && n > 0) {
      router.push({ name: 'SettlementDetail', params: { id: String(n) } })
      return
    }
  }
  const row = it.settlementId
  if (row != null && String(row).trim() !== '') {
    const rn = Number(String(row).trim())
    if (Number.isFinite(rn) && rn > 0) {
      router.push({ name: 'SettlementDetailByRow', params: { rowId: String(rn) } })
    }
  }
}

function onCardClick() {
  if (!props.linkToSettlement) return
  goSettlement()
}

/** 分润明细页按利润上报/根单 ID，避免与结算单 id 混淆 */
function profitReportIdForDistribution() {
  const it = props.item
  return (
    it.profitReportId ??
    it.rootReportId ??
    it.reportId ??
    it.id
  )
}

function goDistribution() {
  const id = profitReportIdForDistribution()
  if (id == null || String(id).trim() === '') return
  router.push({
    name: 'ProfitDistributionDetail',
    params: { profitReportId: String(id) },
  })
}

async function goProfitResubmitOrSettlement() {
  const id = profitReportIdForDistribution()
  if (id == null || String(id).trim() === '') return
  const nav = await resolveProfitResubmitOrSettlementTransferNavigation({
    profitReportId: id,
    settlementOrderId: props.item.settlementOrderId ?? props.item.settlementRowId ?? props.item.settlementId,
    currentUserId: userInfo.value?.id,
    fetchProfitReportById,
    fetchMyPendingPaySettlements,
  })
  if (nav.kind === 'profit-resubmit') {
    router.push({ name: 'ProfitReportResubmit', params: { profitReportId: String(nav.profitReportId) } })
    return
  }
  if (nav.kind === 'settlement-row') {
    router.push({ name: 'SettlementDetailByRow', params: { rowId: String(nav.rowId) } })
    return
  }
  router.push({ name: 'PendingPaySettlements', query: { status: '2' } })
}

function goProfitFlow() {
  const id = profitReportIdForDistribution()
  if (id == null || String(id).trim() === '') return
  router.push({ name: 'ProfitReportFlow', params: { profitReportId: String(id) } })
}

function goProfitFlowDetail() {
  const n = profitFlowRootId.value
  if (n == null) return
  router.push({ name: 'ProfitFlowDetail', params: { rootReportId: String(n) } })
}
</script>

<style scoped>
.profit-card {
  margin-bottom: 10px;
}
.profit-card__title {
  font-weight: 600;
}
.profit-card--clickable {
  cursor: pointer;
}
.profit-card--clickable:active {
  opacity: 0.92;
}
.profit-card__amount {
  color: #ee0a24;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
