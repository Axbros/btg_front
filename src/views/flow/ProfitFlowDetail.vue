<template>
  <div class="profit-flow-detail">
    <AppHeader title="利润分润链路" />

    <van-loading v-if="loading" class="profit-flow-detail__loading" vertical>加载链路详情…</van-loading>

    <template v-else-if="loadError">
      <van-empty description="暂无链路数据" />
    </template>

    <template v-else-if="detail">
      <van-cell-group v-if="dataScopeShown" inset title="数据视图" class="profit-flow-detail__block">
        <van-cell title="视角范围" :value="dataScopeLabel" />
      </van-cell-group>

      <van-cell-group
        v-if="directParentSectionVisible"
        inset
        title="直属上级处理情况"
        class="profit-flow-detail__block"
      >
        <van-cell v-if="directParentStatusDisplay" title="状态" :value="directParentStatusDisplay" />
        <van-cell v-if="directParentReviewerName" title="审核人" :value="directParentReviewerName" />
        <van-cell v-if="directParentRemark" title="备注" :value="directParentRemark" />
        <van-cell v-if="directParentOperateTimeDisplay" title="时间" :value="directParentOperateTimeDisplay" />
      </van-cell-group>

      <ProfitLayerList
        :layers="layersRaw"
        :report-user-name="flowReportUserName"
        :report-profit-amount="flowRootProfitAmount"
        :report-financials-masked="flowRootFinancialsMasked"
      />
      <van-empty v-if="!layersRaw.length" description="暂无链路信息" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ProfitLayerList from '@/components/ProfitLayerList.vue'
import { getProfitFlowDetail } from '@/api/settlement'
import { unwrapProfitFlowDetailPayload } from '@/utils/profitFlowLayer'
import { formatDataScope, formatFlowStatus } from '@/utils/profitFlowDetailFormat'
import { formatDateTime } from '@/utils/format'

const route = useRoute()

const loading = ref(false)
const detail = ref(null)
const loadError = ref(false)

/** 后端已裁剪可见范围，直接使用 layers */
const layersRaw = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return []
  const L = d.layers ?? d.Layers ?? []
  return Array.isArray(L) ? L : []
})

const flowReportUserName = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return ''
  const v =
    d.reportUserName ??
    d.reportUserNickname
  if (v == null || String(v).trim() === '') return ''
  return String(v).trim()
})

const flowRootProfitAmount = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return null
  const raw = d.profitAmount
  if (raw === null || raw === undefined || raw === '') return null
  return raw
})

const flowRootFinancialsMasked = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return false
  return d.financialsMasked === true
})

const dataScopeShown = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return false
  const v = d.dataScope
  return v != null && String(v).trim() !== ''
})

const dataScopeLabel = computed(() => formatDataScope(detail.value?.dataScope))

const normalizedDataScope = computed(() => {
  const v = detail.value?.dataScope
  if (v == null || v === '') return ''
  return String(v).trim().toUpperCase().replace(/-/g, '_')
})

function pickDetailField(key) {
  const d = detail.value
  if (!d || typeof d !== 'object') return ''
  const x = d[key]
  if (x == null || String(x).trim() === '') return ''
  return String(x).trim()
}

const directParentReviewerName = computed(() => pickDetailField('directParentReviewerName'))
const directParentRemark = computed(() => pickDetailField('directParentRemark'))

const directParentStatusDisplay = computed(() => {
  const desc = pickDetailField('directParentStatusDesc')
  if (desc) return desc
  const st = detail.value?.directParentStatus
  if (st == null || st === '') return ''
  const t = formatFlowStatus(st)
  return t === '—' ? '' : t
})

const directParentOperateTimeDisplay = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return ''
  const t = d.directParentOperateTime
  if (t == null || t === '') return ''
  const s = formatDateTime(t)
  return s === '-' ? '' : s
})

const directParentSectionVisible = computed(() => {
  if (normalizedDataScope.value !== 'REPORTER_SUBCHAIN') return false
  return Boolean(
    directParentStatusDisplay.value ||
      directParentReviewerName.value ||
      directParentRemark.value ||
      directParentOperateTimeDisplay.value,
  )
})

function isValidRootId(raw) {
  const s = String(raw ?? '').trim()
  return /^\d+$/.test(s)
}

async function load() {
  const id = route.params.rootReportId
  if (!isValidRootId(id)) {
    loadError.value = true
    detail.value = null
    loading.value = false
    showToast('无效的利润根单 ID')
    return
  }
  loading.value = true
  loadError.value = false
  detail.value = null
  try {
    const data = await getProfitFlowDetail(id)
    detail.value =
      unwrapProfitFlowDetailPayload(data) ?? (data && typeof data === 'object' ? data : null)
    if (!detail.value) loadError.value = true
  } catch {
    loadError.value = true
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.rootReportId,
  () => load(),
  { immediate: true },
)
</script>

<style scoped>
.profit-flow-detail {
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}
.profit-flow-detail__loading {
  padding: 48px 0;
}
.profit-flow-detail__block {
  margin: 12px 0 0;
}
</style>
