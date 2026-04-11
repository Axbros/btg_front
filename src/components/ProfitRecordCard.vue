<template>
  <van-cell-group
    inset
    class="profit-card"
    :class="{ 'profit-card--clickable': linkToSettlement }"
    @click="onCardClick"
  >
    <van-cell :title="orderNo" :value="statusText" :is-link="linkToSettlement">
      <template #title>
        <span class="profit-card__title">{{ orderNo }}</span>
      </template>
    </van-cell>
    <van-cell title="总利润" :value="formatMoney(item.profitAmount)" />
    <!-- <van-cell title="子级利润比例" :value="formatRate(ratioField)" /> -->
    <!-- <van-cell title="自留分润" :value="formatMoney(netField)" /> -->
    <!-- <van-cell title="链路上级计提" :value="formatMoney(shareUpField)" /> -->
    <van-cell title="提交时间" :value="formatDateTime(item.submitTime)" />
    <van-cell v-if="item.auditTime" title="审核时间" :value="formatDateTime(item.auditTime)" />
    <van-cell v-if="item.auditRemark" title="审核备注" :label="item.auditRemark" />
    <van-cell
      v-if="canShowDistributionLink"
      title="分润明细"
      is-link
      @click.stop="goDistribution"
    />
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatDateTime, formatRate, formatProfitRecordStatus } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true },
  showDistributionLink: { type: Boolean, default: false },
  /** 为 true 时（如「我的利润上报记录」）点击卡片跳结算详情；路由 id 为 root_report_id（与利润单 id 一致） */
  linkToSettlement: { type: Boolean, default: false },
})

const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

/** 仅根用户可查看整条链路分润明细（与后端 isRoot 一致） */
const isRootUser = computed(() => {
  const u = userInfo.value
  if (!u) return false
  const v = u.isRoot ?? u.is_root
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

const orderNo = computed(
  () =>
    props.item.reportNo ??
    props.item.report_no ??
    props.item.recordNo ??
    props.item.record_no ??
    (props.item.id != null ? `#${props.item.id}` : '—'),
)

const statusText = computed(() => formatProfitRecordStatus(props.item.status))

const ratioField = computed(
  () => props.item.childProfitRatio ?? props.item.child_profit_ratio ?? props.item.commissionRate ?? props.item.rate,
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
  const root = it.rootReportId ?? it.root_report_id ?? it.id
  if (root != null && String(root).trim() !== '') {
    const n = Number(root)
    if (Number.isFinite(n) && n > 0) {
      router.push({ name: 'SettlementDetail', params: { id: String(n) } })
      return
    }
  }
  const row = it.settlementId ?? it.settlement_id
  if (row != null && String(row).trim() !== '') {
    router.push({ name: 'SettlementDetailByRow', params: { rowId: String(row).trim() } })
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
    it.profit_report_id ??
    it.rootReportId ??
    it.root_report_id ??
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
</style>
