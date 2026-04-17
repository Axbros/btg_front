<template>
  <div class="repay-flow-detail">
    <AppHeader title="归仓状态流" />
    <van-loading v-if="loading" class="repay-flow-detail__loading" vertical>加载中…</van-loading>
    <van-empty v-else-if="!hasAnyPayload" description="暂无归仓流转数据" />
    <template v-else>
      <van-cell-group inset title="归仓摘要" class="block">
        <van-cell title="归仓申请 ID" :value="txt(summary.id)" />
        <van-cell title="关联补仓单号" :value="txt(summary.replenishApplyNo)" />
        <van-cell title="归仓金额" :value="formatMoney(num(summary.repayAmount))" />
        <van-cell title="当前状态">
          <template #value>
            <van-tag :type="repayStatusTagType(summary.status)" plain round>
              {{ formatRepayStatus(summary.status) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="当前处理人" :value="txt(summary.currentHandlerUserName)" />
        <van-cell title="资方执行用户" :value="txt(summary.capitalUserName)" />
        <van-cell title="资方收款 UID" :value="txt(summary.capitalReceiverUid)" />
        <van-cell title="提交次数" :value="submitVersionText(summary.submitVersion)" />
        <van-cell v-if="summary.lastRejectReason" title="最后拒绝原因" :label="txt(summary.lastRejectReason)" />
      </van-cell-group>

      <van-cell-group v-if="showReplBlock" inset title="关联补仓摘要" class="block">
        <van-cell title="补仓申请金额" :value="formatMoney(num(repl.approvedAmount))" />
        <van-cell title="完成归仓金额" :value="formatMoney(num(repl.repaidAmount))" />
        <van-cell title="待审归仓金额" :value="formatMoney(num(repl.pendingRepayAmount))" />
        <van-cell title="剩余归仓金额" :value="formatMoney(num(repl.remainingAmount))" />
      </van-cell-group>

      <van-cell-group inset title="状态流时间线" class="block">
        <BusinessFlowTimeline :nodes="timelineNodes" />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import BusinessFlowTimeline from '@/components/BusinessFlowTimeline.vue'
import { getRepayFlow, getRepayDetail } from '@/api/replenishment'
import { formatMoney, formatRepayStatus, repayStatusTagType } from '@/utils/format'

const route = useRoute()

const loading = ref(false)
const flowRaw = ref(null)
const detailRaw = ref(null)

const repayId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function submitVersionText(v) {
  if (v == null || v === '') return '—'
  return String(v)
}

function pickFirstObj(...cands) {
  for (const c of cands) {
    if (c && typeof c === 'object' && !Array.isArray(c)) return c
  }
  return null
}

function mergeLayer(base, extra) {
  const a = base && typeof base === 'object' && !Array.isArray(base) ? base : {}
  const b = extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : {}
  return { ...a, ...b }
}

const flowObj = computed(() => (flowRaw.value && typeof flowRaw.value === 'object' ? flowRaw.value : null))
const detailObj = computed(() => (detailRaw.value && typeof detailRaw.value === 'object' ? detailRaw.value : null))

const summary = computed(() => {
  const f = flowObj.value
  const d = detailObj.value
  const fr = pickFirstObj(f?.report, f?.repay, f?.repayApply)
  const dr = pickFirstObj(d?.report, d?.repay, d?.repayApply)
  const m = mergeLayer(mergeLayer(d || {}, dr || {}), mergeLayer(f || {}, fr || {}))
  return {
    id: m.id ?? repayId.value,
    replenishApplyNo: m.replenishApplyNo,
    repayAmount: m.repayAmount,
    status: m.status ?? m.currentStatus,
    currentHandlerUserName: m.currentHandlerUserName,
    capitalUserName: m.capitalUserName,
    capitalReceiverUid: m.capitalReceiverUid,
    submitVersion: m.submitVersion,
    lastRejectReason: m.lastRejectReason,
  }
})

const repl = computed(() => {
  const f = flowObj.value
  const d = detailObj.value
  const sub =
    pickFirstObj(
      f?.replenishmentApply,
      f?.replenishApply,
      f?.replenishment,
      d?.replenishmentApply,
      d?.replenishApply,
      d?.replenishment,
      f?.replenishmentSummary,
      d?.replenishmentSummary,
    ) || {}
  return {
    approvedAmount: sub.approvedAmount,
    repaidAmount: sub.repaidAmount,
    pendingRepayAmount: sub.pendingRepayAmount,
    remainingAmount: sub.remainingAmount,
  }
})

const showReplBlock = computed(() => {
  const r = repl.value
  return (
    r.approvedAmount != null ||
    r.repaidAmount != null ||
    r.pendingRepayAmount != null ||
    r.remainingAmount != null
  )
})

function pickNodes(src) {
  if (!src || typeof src !== 'object') return []
  const n =
    src.nodes ??
    src.flowNodes ??
    src.flowLogs ??
    src.nodeList ??
    src.businessFlowNodes ??
    src.records ??
    src.steps
  return Array.isArray(n) ? n : []
}

const timelineNodes = computed(() => {
  const fromFlow = pickNodes(flowObj.value)
  if (fromFlow.length) return fromFlow
  return pickNodes(detailObj.value)
})

const hasAnyPayload = computed(() => !!(flowObj.value || detailObj.value))

async function load() {
  const id = repayId.value
  if (id == null) {
    flowRaw.value = null
    detailRaw.value = null
    loading.value = false
    return
  }
  loading.value = true
  flowRaw.value = null
  detailRaw.value = null
  try {
    const [flow, detail] = await Promise.all([
      getRepayFlow(id).catch(() => null),
      getRepayDetail(id).catch(() => null),
    ])
    flowRaw.value = flow && typeof flow === 'object' ? flow : null
    detailRaw.value = detail && typeof detail === 'object' ? detail : null
  } catch {
    flowRaw.value = null
    detailRaw.value = null
  } finally {
    loading.value = false
  }
}

watch(repayId, () => load(), { immediate: true })
</script>

<style scoped>
.repay-flow-detail {
  padding-bottom: env(safe-area-inset-bottom);
}
.block {
  margin-top: 12px;
}
.repay-flow-detail__loading {
  padding: 48px 0;
}
</style>
