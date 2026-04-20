<template>
  <div class="ppay-mine">
    <AppHeader title="待支付给团队长" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="ppay-mine-wrap" :class="{ 'ppay-mine-wrap--docked': loaded }">
        <div class="ppay-mine-filter">
          <van-dropdown-menu>
            <van-dropdown-item v-model="payStatusFilter" :options="payStatusFilterOptions" />
          </van-dropdown-menu>
        </div>

        <van-list
          :key="payStatusFilter"
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell-group v-if="list.length" inset :border="false" class="ppay-mine-list-group">
            <van-cell
              v-for="row in list"
              :key="row.id"
              :title="cellTitle(row)"
              :label="payLabel(row)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goDetail(row)"
              @keydown.enter.prevent="goDetail(row)"
              @keydown.space.prevent="goDetail(row)"
            >
              <template #value>
                <van-tag :type="settlementStatusTagType(row.status)" plain round>
                  {{ formatSettlementStatus(row.status) }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <EmptyState v-if="!loading && !list.length && loaded" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="ppay-mine-bottom-dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0" class="ppay-mine-footer-sum" aria-label="应付金额汇总">
        <div class="ppay-mine-footer-sum__row">
          <span class="ppay-mine-footer-sum__label">{{ paySumLabel }}</span>
          <span class="ppay-mine-footer-sum__value">{{ formatMoney(payAmountPageSum) }}</span>
        </div>
        <p class="ppay-mine-footer-sum__meta">共 {{ recordsTotal }} 笔</p>
      </footer>
      <div class="ppay-mine-pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="ppay-mine-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchMyPendingPaySettlements } from '@/api/settlement'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatSettlementStatus, settlementStatusTagType } from '@/utils/format'

const route = useRoute()
const router = useRouter()

/** 下拉 value：`default` 不传 status；`1`～`5` 传 status */
const payStatusFilterOptions = [
  { text: '全部', value: 'default' },
  ...[1, 2, 3, 4, 5].map((n) => ({
    text: formatSettlementStatus(n),
    value: String(n),
  })),
]

function isValidPayStatusQuery(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 5
}

function payStatusFromQuery() {
  const raw = route.query.status
  if (raw === undefined || raw === null) return 'default'
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw).trim()
  if (s === '') return 'default'
  if (!isValidPayStatusQuery(s)) return 'default'
  return String(Number(s))
}

const payStatusFilter = ref(payStatusFromQuery())

function queryEquals(nextQuery) {
  return JSON.stringify({ ...route.query }) === JSON.stringify({ ...nextQuery })
}

watch(payStatusFilter, (val) => {
  page.value = 1
  list.value = []
  loaded.value = false
  finished.value = false
  const q = { ...route.query }
  if (val === 'default') {
    delete q.status
  } else {
    q.status = val
  }
  if (!queryEquals(q)) {
    router.replace({ name: 'PendingPaySettlements', query: q })
  }
})

watch(
  () => route.query.status,
  () => {
    const next = payStatusFromQuery()
    if (next !== payStatusFilter.value) {
      payStatusFilter.value = next
    }
  },
)

onMounted(() => {
  const raw = route.query.status
  if (raw !== undefined && raw !== null && String(Array.isArray(raw) ? raw[0] : raw).trim() !== '') {
    if (!isValidPayStatusQuery(Array.isArray(raw) ? raw[0] : raw)) {
      const q = { ...route.query }
      delete q.status
      router.replace({ name: 'PendingPaySettlements', query: q })
    }
  }
})

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
const recordsTotal = ref(0)

const payAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => {
    const n = Number(row.payAmount ?? row.payableAmount ?? row.amount ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0),
)

const paySumLabel = computed(() => {
  if (!hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value) {
    return '应付金额合计'
  }
  return '本页应付金额合计'
})

function cellTitle(row) {
  const nick = String(row?.reportUserNickname ?? '').trim()
  if (nick) return `利润来源 · ${nick}`
  return row?.id != null ? `结算 #${row.id}` : '—'
}

function payLabel(row) {
  const v = row?.payAmount ?? row?.payableAmount ?? row?.amount
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  const t = Number.isFinite(n) ? formatMoney(n) : String(v).trim()
  return `应付金额：${t}`
}

function goDetail(row) {
  const root = row?.rootReportId ?? row?.reportId
  if (root != null && String(root).trim() !== '') {
    const n = Number(root)
    if (Number.isFinite(n) && n > 0) {
      router.push({ name: 'SettlementDetail', params: { id: String(n) } })
      return
    }
  }
  if (row?.id != null) {
    router.push({ name: 'SettlementDetailByRow', params: { rowId: String(row.id) } })
  }
}

function payStatusApiParam() {
  if (payStatusFilter.value === 'default') return undefined
  const n = Number(payStatusFilter.value)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined
}

async function fetchPage(p) {
  const status = payStatusApiParam()
  const raw = await fetchMyPendingPaySettlements({
    page: p,
    pageSize: pageSize.value,
    ...(status != null ? { status } : {}),
  })
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = parsed.list
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  const t = parsed.total != null ? Number(parsed.total) : 0
  recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : 0
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchPage(page.value)
  } catch {
    finished.value = true
    showToast('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  try {
    await fetchPage(1)
  } finally {
    refreshing.value = false
  }
}

function prev() {
  if (page.value <= 1) return
  page.value -= 1
  fetchPage(page.value)
}

function next() {
  if (!hasMore.value) return
  page.value += 1
  fetchPage(page.value)
}
</script>

<style scoped>
.ppay-mine {
  min-width: 0;
}
.ppay-mine-filter {
  margin: 0 0 4px;
  background: #fff;
}
.ppay-mine-filter :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
.ppay-mine-wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.ppay-mine-wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.ppay-mine-bottom-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.ppay-mine-intro {
  margin: 10px 16px 0;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.ppay-mine-list-title {
  margin: 16px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.ppay-mine-list-group {
  margin-top: 4px;
  background: transparent;
}
.ppay-mine-list-group :deep(.van-cell) {
  margin: 0 0 8px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.ppay-mine-list-group :deep(.van-cell:last-of-type) {
  margin-bottom: 0;
}
.ppay-mine-list-group :deep(.van-cell__title) {
  flex: 1.2;
  min-width: 0;
  font-weight: 500;
}
.ppay-mine-list-group :deep(.van-cell__value) {
  flex-shrink: 0;
  padding-right: 22px;
}
.ppay-mine-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.ppay-mine-pager__text {
  font-size: 13px;
  color: #646566;
}
.ppay-mine-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
  border: none;
}
.ppay-mine-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ppay-mine-footer-sum__label {
  font-size: 14px;
  color: #646566;
}
.ppay-mine-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.ppay-mine-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
</style>
