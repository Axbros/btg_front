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

      <van-cell-group v-if="replenishmentFlowExtraVisible" inset title="资方与到账确认" class="flow-detail__block">
        <van-cell title="资方执行用户" :value="replCapitalExecutorText" />
        <van-cell title="资方收款 UID" :value="replCapitalReceiverUidText" />
        <van-cell title="到账确认状态">
          <template #value>
            <van-tag
              v-if="replArrivalStatusRaw != null && String(replArrivalStatusRaw) !== ''"
              :type="arrivalConfirmStatusTagType(replArrivalStatusRaw)"
              plain
              round
            >
              {{ formatArrivalConfirmStatus(replArrivalStatusRaw) }}
            </van-tag>
            <span v-else>—</span>
          </template>
        </van-cell>
        <van-cell title="到账确认时间" :value="formatDateTime(replArrivalConfirmTime)" />
        <van-cell title="到账确认备注" :value="replArrivalConfirmRemarkText" />
        <van-cell v-if="replTransferScreenshotUrl" title="资方转账凭证">
          <template #value>
            <PreviewableRemoteImage :url="replTransferScreenshotUrl" alt="资方转账凭证" size="large" />
          </template>
        </van-cell>
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
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import { getProfitReportFlow } from '@/api/profitReport'
import { getReplenishmentFlow, getRepayFlow } from '@/api/replenishment'
import {
  formatArrivalConfirmStatus,
  arrivalConfirmStatusTagType,
  formatDateTime,
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
    const no = r.reportNo
    if (no != null && String(no).trim() !== '') return String(no).trim()
  }
  return String(p.title ?? p.reportNo ?? p.applyNo ?? '').trim()
})

const currentStatus = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const rep = p.report && typeof p.report === 'object' ? p.report : null
  return (
    p.currentStatus ??
    p.status ??
    rep?.flowStatus ??
    rep?.status ??
    null
  )
})

const handlerText = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return ''
  const name =
    p.currentHandlerNickname ??
    p.currentHandlerName ??
    p.currentHandlerUserName
  const uid = p.currentHandlerUserId
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
    rep?.lastRejectReason
  if (r == null || String(r).trim() === '') return ''
  return String(r).trim()
})

const submitVersion = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const r = p.report
  return (
    p.submitVersion ??
    (r && typeof r === 'object' ? r.submitVersion : null) ??
    null
  )
})

const returnedFlag = computed(() => {
  const p = payload.value
  if (!p || typeof p !== 'object') return null
  const v = p.returnedToApplicant ?? p.returned ?? p.isReturned
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0') return false
  return null
})

function pickReplenishmentShape(p) {
  if (!p || typeof p !== 'object') return p
  const sub = p.replenishment ?? p.replenishmentApply
  if (sub && typeof sub === 'object') return sub
  return p
}

const replenishmentFlowExtraVisible = computed(() => {
  if (flowKind.value !== 'replenishment') return false
  const r = pickReplenishmentShape(payload.value)
  if (!r || typeof r !== 'object') return false
  const keys = [
    'assignedCapitalNickname',
    'assignedCapitalUserName',
    'assignedCapitalUserId',
    'capitalReceiverUid',
    'arrivalConfirmStatus',
    'arrivalConfirmTime',
    'arrivalConfirmRemark',
    'transferScreenshotUrl',
  ]
  return keys.some((k) => r[k] != null && r[k] !== '')
})

const replCapitalExecutorText = computed(() => {
  if (flowKind.value !== 'replenishment') return '—'
  const r = pickReplenishmentShape(payload.value)
  if (!r || typeof r !== 'object') return '—'
  const a = r.assignedCapitalNickname
  const b = r.assignedCapitalUserName
  const name =
    (a != null && String(a).trim() !== '' ? String(a).trim() : '') ||
    (b != null && String(b).trim() !== '' ? String(b).trim() : '')
  const uid = r.assignedCapitalUserId
  if (name && uid != null) return `${name}（#${uid}）`
  if (name) return name
  if (uid != null) return `用户 #${uid}`
  return '—'
})

const replCapitalReceiverUidText = computed(() => {
  if (flowKind.value !== 'replenishment') return '—'
  const r = pickReplenishmentShape(payload.value)
  const v = r?.capitalReceiverUid
  if (v == null || String(v).trim() === '') return '—'
  return String(v).trim()
})

const replArrivalStatusRaw = computed(() => {
  if (flowKind.value !== 'replenishment') return null
  return pickReplenishmentShape(payload.value)?.arrivalConfirmStatus ?? null
})

const replArrivalConfirmTime = computed(() => {
  if (flowKind.value !== 'replenishment') return null
  return pickReplenishmentShape(payload.value)?.arrivalConfirmTime ?? null
})

const replArrivalConfirmRemarkText = computed(() => {
  if (flowKind.value !== 'replenishment') return '—'
  const v = pickReplenishmentShape(payload.value)?.arrivalConfirmRemark
  if (v == null || String(v).trim() === '') return '—'
  return String(v).trim()
})

const replTransferScreenshotUrl = computed(() => {
  if (flowKind.value !== 'replenishment') return ''
  const u = pickReplenishmentShape(payload.value)?.transferScreenshotUrl
  return u != null && String(u).trim() !== '' ? String(u).trim() : ''
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
