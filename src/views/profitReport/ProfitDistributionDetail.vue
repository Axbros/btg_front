<template>
  <div>
    <AppHeader title="分润明细" />
    <van-loading v-if="loading" class="pad" vertical>加载分润明细…</van-loading>
    <template v-else-if="rows.length">
      <van-cell-group inset title="按链路分配（逐级汇总）">
        <template v-for="(row, idx) in rows" :key="idx">
          <van-cell :title="titleCell(row)" :value="amountCell(row)" :label="labelCell(row)" />
          <div v-if="idx < rows.length - 1" class="dist-chain__arrow" role="presentation">
            <van-icon name="arrow-up" class="dist-chain__arrow-icon" />
            <span class="dist-chain__arrow-text">向上一级汇总</span>
          </div>
        </template>
      </van-cell-group>
      <p v-if="note" class="note">{{ note }}</p>
    </template>
    <EmptyState v-else description="暂无分润明细或无权查看" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchProfitDistributionByReportId } from '@/api/profitDistribution'
import { formatMoney, formatRate } from '@/utils/format'

const route = useRoute()
const loading = ref(true)
const payload = ref(null)

const profitReportId = computed(() => {
  const n = Number(route.params.profitReportId)
  return Number.isFinite(n) && n > 0 ? n : null
})

function extractRows(data) {
  if (!data) return []
  if (Array.isArray(data.lines)) return data.lines
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.allocations)) return data.allocations
  if (Array.isArray(data.nodes)) return data.nodes
  if (Array.isArray(data)) return data
  return []
}

const rows = computed(() => extractRows(payload.value))

const note = computed(() => {
  const t = payload.value?.remark ?? payload.value?.note ?? payload.value?.description
  return t ? String(t) : ''
})

function titleCell(row) {
  const display =
    pickStr(
      row.beneficiaryDisplayName,
      row.beneficiary_display_name,
      row.userNickname,
      row.nickname,
      row.userName,
      row.layerName,
    ) || pickStr(row.roleLabel, row.levelLabel)
  if (display) return display
  const uid = row.beneficiaryUserId ?? row.beneficiary_user_id
  if (uid != null) return `用户 ${uid}`
  return '—'
}

function amountCell(row) {
  const v =
    row.incomeAmount ??
    row.income_amount ??
    row.allocatedAmount ??
    row.amount ??
    row.shareAmount ??
    row.profitShare ??
    row.retainedAmount
  return formatMoney(v)
}

function labelCell(row) {
  const u = row.upperRatio ?? row.upper_ratio
  const l = row.lowerRatio ?? row.lower_ratio
  const parts = []
  if (u != null && l != null && Number.isFinite(Number(u)) && Number.isFinite(Number(l))) {
    parts.push(`比例切片 ${formatRate(Number(u) - Number(l))}（上界 ${formatRate(u)} / 下界 ${formatRate(l)}）`)
  }
  const layer = row.levelNo ?? row.depth ?? row.layer ?? row.level
  if (layer != null && layer !== '') parts.push(`层级 ${layer}`)
  return parts.join(' · ') || '相对总利润的链路分润'
}

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

async function load() {
  const id = profitReportId.value
  if (id == null) {
    payload.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    payload.value = await fetchProfitDistributionByReportId(id)
  } catch {
    payload.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(
  () => route.params.profitReportId,
  () => load(),
)
</script>

<style scoped>
.pad {
  padding: 48px 0;
}
.note {
  margin: 12px 16px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.dist-chain__arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 0 12px;
  margin: 0 12px;
  border-left: 1px dashed #dcdee0;
  border-right: 1px dashed #dcdee0;
  background: linear-gradient(180deg, rgba(7, 193, 96, 0.04) 0%, rgba(7, 193, 96, 0.08) 50%, rgba(7, 193, 96, 0.04) 100%);
}
.dist-chain__arrow-icon {
  font-size: 22px;
  color: #07c160;
  line-height: 1;
}
.dist-chain__arrow-text {
  font-size: 12px;
  color: #969799;
  letter-spacing: 0.02em;
}
</style>
