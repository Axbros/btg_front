<template>
  <div class="admin-repay-pending">
    <AppHeader title="待审核归仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="admin-repay-pending__wrap" :class="{ 'admin-repay-pending__wrap--docked': loaded }">
        <div class="admin-repay-pending__filter">
          <van-dropdown-menu>
            <van-dropdown-item v-model="statusFilter" :options="statusFilterOptions" />
          </van-dropdown-menu>
        </div>

        <van-list
          :key="statusFilter"
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <template v-if="list.length">
            <van-cell-group inset :border="false" class="prev-mine-list-group">
              <van-cell
                v-for="(row, idx) in list"
                :key="row.id ?? idx"
                :title="row.repayNo"
                :label="repayReviewLabel(row)"
                :border="false"
                is-link
                @click="goDetail(row)"
              >
                <template #value>
                  <van-tag :type="repayStatusTagType(row.status)" plain round>
                    {{ formatRepayStatus(row.status) }}
                  </van-tag>
                </template>
              </van-cell>
            </van-cell-group>
          </template>
          <EmptyState v-if="!loading && !list.length && loaded" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="admin-repay-pending__dock" aria-label="底部统计与分页">
      <footer v-if="recordsTotal > 0 || list.length" class="admin-repay-pending__sum" aria-label="列表汇总">
        <div class="admin-repay-pending__sum-row">
          <span class="admin-repay-pending__sum-label">{{ amountSumLabel }}</span>
          <span class="admin-repay-pending__sum-value">{{ formatMoney(pendingAmountPageSum) }}</span>
        </div>
        <p v-if="recordsTotal > 0" class="admin-repay-pending__sum-meta">共 {{ recordsTotal }} 条{{ recordsMetaHint }}</p>
      </footer>
      <div class="admin-repay-pending__pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
        <span class="admin-repay-pending__pager-text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchAdminRepaysPending } from '@/api/adminReplenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatRepayStatus, repayStatusTagType } from '@/utils/format'

/** 与 {@link formatRepayStatus} 数字态一致 */
const STATUS_FILTER_OPTIONS = [
  { text: '待资方审核', value: '1' },
  { text: '已通过', value: '2' },
  { text: '已拒绝', value: '3' },
  { text: '已退回待修改', value: '4' },
  { text: '全部', value: 'all' },
]

const route = useRoute()
const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
const recordsTotal = ref(0)

const statusFilterOptions = STATUS_FILTER_OPTIONS

function isValidStatusQuery(v) {
  if (v === 'all') return true
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 4
}

function statusFromQuery() {
  const raw = route.query.status
  if (raw === undefined || raw === null) return '1'
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw).trim()
  if (s === '') return '1'
  if (s === 'all') return 'all'
  if (!isValidStatusQuery(s)) return '1'
  return String(Number(s))
}

const statusFilter = ref(statusFromQuery())

function queryEquals(nextQuery) {
  return JSON.stringify({ ...route.query }) === JSON.stringify({ ...nextQuery })
}

watch(statusFilter, (val) => {
  page.value = 1
  list.value = []
  loaded.value = false
  finished.value = false
  const q = { ...route.query }
  if (val === 'all') {
    q.status = 'all'
  } else {
    q.status = val
  }
  if (!queryEquals(q)) {
    router.replace({ name: 'AdminPendingRepays', query: q })
  }
})

watch(
  () => route.query.status,
  () => {
    const next = statusFromQuery()
    if (next === statusFilter.value) return
    page.value = 1
    list.value = []
    loaded.value = false
    finished.value = false
    statusFilter.value = next
  },
)

onMounted(() => {
  const raw = route.query.status
  if (raw === undefined || raw === null) return
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw).trim()
  if (s !== '' && !isValidStatusQuery(s)) {
    const q = { ...route.query }
    delete q.status
    router.replace({ name: 'AdminPendingRepays', query: q })
  }
})

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

/** 与补仓审核列表首行 title 一致：优先展示申请人昵称 */
function applicantSummaryTitle(row) {
  const nick = txt(row?.applicantNickname)
  if (nick && nick !== '—') return nick
  return row?.id != null ? `归仓申请 #${row.id}` : '申请人'
}

function repayNoText(row) {
  const no = row?.repayNo
  if (no != null && String(no).trim() !== '') return String(no).trim()
  return row?.id != null ? `（暂无单号）#${row.id}` : '—'
}

/** 与 PendingReviewList 的 reviewLabel 同理：副文一行展示关键字段 */
function repayReviewLabel(row) {
  return `待归仓金额：${formatMoney(pendingAmountNum(row))}`
}

function pendingAmountNum(row) {
  const n = Number(row?.replenishPendingRepayAmount ?? 0)
  return Number.isFinite(n) ? n : 0
}

const pendingAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => sum + pendingAmountNum(row), 0),
)

const amountSumLabel = computed(() => {
  const onOnePage =
    !hasMore.value &&
    recordsTotal.value > 0 &&
    list.value.length === recordsTotal.value
  if (onOnePage) {
    return '待归仓金额合计'
  }
  return '本页待归仓金额合计'
})

const recordsMetaHint = computed(() => {
  if (statusFilter.value === 'all') return ''
  const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter.value)
  return opt ? `（${opt.text}）` : ''
})

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'AdminRepayDetail', params: { id: String(id) } })
}

async function applyListFromRaw(raw) {
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = Array.isArray(parsed.list) ? parsed.list : []
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  const t = parsed.total != null ? Number(parsed.total) : 0
  recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : 0
}

function statusApiParam() {
  const st = statusFilter.value
  if (st === 'all') return undefined
  const n = Number(st)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n : undefined
}

async function fetchPage(p) {
  const st = statusApiParam()
  const raw = await fetchAdminRepaysPending({
    page: p,
    size: pageSize.value,
    ...(st != null ? { status: st } : {}),
  })
  await applyListFromRaw(raw)
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchPage(page.value)
  } catch {
    finished.value = true
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

async function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  try {
    await fetchPage(page.value)
  } catch {
    /* 拦截器 Toast */
  }
}
</script>

<style scoped>
.admin-repay-pending {
  min-width: 0;
}
.admin-repay-pending__filter {
  margin: 0 0 4px;
  background: #fff;
}
.admin-repay-pending__filter :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
.admin-repay-pending__wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.admin-repay-pending__wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
/** 与下级结算 pending-review 列表同款扁平 cell */
.prev-mine-list-group {
  margin-top: 4px;
  background: transparent;
}
.prev-mine-list-group :deep(.van-cell) {
  margin: 0 0 8px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.prev-mine-list-group :deep(.van-cell:last-of-type) {
  margin-bottom: 0;
}
.prev-mine-list-group :deep(.van-cell__title) {
  flex: 1.2;
  min-width: 0;
  font-weight: 500;
}
.prev-mine-list-group :deep(.van-cell__value) {
  flex-shrink: 0;
  padding-right: 22px;
}
.admin-repay-pending__dock {
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
.admin-repay-pending__sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.admin-repay-pending__sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.admin-repay-pending__sum-label {
  font-size: 14px;
  color: #646566;
}
.admin-repay-pending__sum-value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.admin-repay-pending__sum-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.admin-repay-pending__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.admin-repay-pending__pager-text {
  font-size: 13px;
  color: #646566;
}
</style>
