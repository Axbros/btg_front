<template>
  <div class="flow-detail">
    <AppHeader :title="headerTitle" />
    <van-loading v-if="loading" class="flow-detail__loading" vertical>加载流转信息…</van-loading>
    <van-empty v-else-if="!payload" description="暂无流转数据" />
    <template v-else>
      <van-cell-group inset title="概要" class="flow-detail__block">
        <van-cell v-if="titleText" title="标题" :value="titleText" />
        <van-cell title="当前状态" :value="formatStatusText(currentStatus)" />
        <van-cell v-if="handlerText" title="当前处理人" :value="handlerText" />
        <van-cell v-if="rejectReason" title="最后拒绝原因" :label="rejectReason" />
        <van-cell v-if="submitVersion != null && submitVersion !== ''" title="提交版本" :value="String(submitVersion)" />
        <van-cell v-if="returnedFlag != null" title="是否退回" :value="returnedFlag ? '是' : '否'" />
      </van-cell-group>

      <van-cell-group inset title="流转节点" class="flow-detail__block">
        <BusinessFlowTimeline :nodes="nodes" />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import BusinessFlowTimeline from '@/components/BusinessFlowTimeline.vue'
import { getProfitReportFlow } from '@/api/profitReport'
import { getReplenishmentFlow, getRepayFlow } from '@/api/replenishment'
import {
  formatProfitRecordStatus,
  formatReplenishmentStatus,
  formatRepayStatus,
} from '@/utils/format'

const route = useRoute()

const loading = ref(false)
const payload = ref(null)

const flowKind = computed(() => String(route.meta.flowKind || 'profit'))

const headerTitle = computed(() => {
  const k = flowKind.value
  if (k === 'replenishment') return '补仓·状态流'
  if (k === 'repay') return '归仓·状态流'
  return '利润·流转详情'
})

const entityId = computed(() => {
  const a = route.params.profitReportId ?? route.params.id
  const n = Number(a)
  return Number.isFinite(n) && n > 0 ? n : null
})

function pickNodes(d) {
  if (!d || typeof d !== 'object') return []
  const n =
    d.nodes ??
    d.flowNodes ??
    d.nodeList ??
    d.businessFlowNodes ??
    d.records ??
    d.steps
  return Array.isArray(n) ? n : []
}

const nodes = computed(() => pickNodes(payload.value))

const titleText = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return ''
  const r = p.report
  if (r && typeof r === 'object') {
    const no = r.reportNo ?? r.report_no
    if (no != null && String(no).trim() !== '') return String(no).trim()
  }
  return String(p.title ?? p.reportNo ?? p.report_no ?? p.applyNo ?? p.apply_no ?? '').trim()
})

const currentStatus = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const rep = p.report && typeof p.report === 'object' ? p.report : null
  return (
    p.currentStatus ??
    p.current_status ??
    p.status ??
    rep?.flowStatus ??
    rep?.flow_status ??
    rep?.status ??
    null
  )
})

const handlerText = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return ''
  const name =
    p.currentHandlerNickname ??
    p.current_handler_nickname ??
    p.currentHandlerName ??
    p.current_handler_name ??
    p.currentHandlerUserName
  const uid = p.currentHandlerUserId ?? p.current_handler_user_id
  const parts = []
  if (name != null && String(name).trim() !== '') parts.push(String(name).trim())
  if (uid != null && String(uid).trim() !== '') parts.push(`ID:${String(uid).trim()}`)
  return parts.join(' ')
})

const rejectReason = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return ''
  const rep = p.report && typeof p.report === 'object' ? p.report : null
  const r =
    p.lastRejectReason ??
    p.last_reject_reason ??
    rep?.lastRejectReason ??
    rep?.last_reject_reason
  if (r == null || String(r).trim() === '') return ''
  return String(r).trim()
})

const submitVersion = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const r = p.report
  return (
    p.submitVersion ??
    p.submit_version ??
    (r && typeof r === 'object' ? r.submitVersion ?? r.submit_version : null) ??
    null
  )
})

const returnedFlag = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const v = p.returnedToApplicant ?? p.returned_to_applicant ?? p.returned ?? p.isReturned
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0') return false
  return null
})

function formatStatusText(v) {
  if (v === null || v === undefined || v === '') return '未知状态'
  const k = flowKind.value
  if (k === 'replenishment') return formatReplenishmentStatus(v)
  if (k === 'repay') return formatRepayStatus(v)
  return formatProfitRecordStatus(v)
}

async function load() {
  const id = entityId.value
  loading.value = true
  payload.value = null
  if (id == null) {
    loading.value = false
    return
  }
  try {
    let data = null
    const k = flowKind.value
    if (k === 'replenishment') {
      data = await getReplenishmentFlow(id)
    } else if (k === 'repay') {
      data = await getRepayFlow(id)
    } else {
      data = await getProfitReportFlow(id)
    }
    payload.value = data != null && typeof data === 'object' ? data : null
  } catch {
    payload.value = null
  } finally {
    loading.value = false
  }
}

watch([entityId, flowKind], () => load(), { immediate: true })
</script>

<style scoped>
.flow-detail__loading {
  padding: 48px 0;
}
.flow-detail__block {
  margin-top: 12px;
}
</style>
