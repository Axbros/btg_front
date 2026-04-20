<template>
  <div class="prev-mine">
    <AppHeader title="下级结算" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="prev-mine-wrap" :class="{ 'prev-mine-wrap--docked': loaded }">
        <div class="prev-mine-filter">
          <van-dropdown-menu>
            <van-dropdown-item v-model="reviewScope" :options="reviewScopeFilterOptions" />
          </van-dropdown-menu>
        </div>
        <van-list
          :key="reviewScope"
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell-group v-if="list.length" inset :border="false" class="prev-mine-list-group">
            <van-cell
              v-for="item in list"
              :key="item.id"
              :title="cellTitle(item)"
              :label="reviewLabel(item)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goDetail(item)"
              @keydown.enter.prevent="goDetail(item)"
              @keydown.space.prevent="goDetail(item)"
            >
              <template #value>
                <van-tag :type="settlementStatusTagType(item.status)" plain round>
                  {{ formatSettlementStatus(item.status) }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <EmptyState v-if="!loading && !list.length && loaded" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="prev-mine-bottom-dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0" class="prev-mine-footer-sum" aria-label="上报利润汇总">
        <div class="prev-mine-footer-sum__row">
          <span class="prev-mine-footer-sum__label">{{ profitSumLabel }}</span>
          <span class="prev-mine-footer-sum__value">{{ formatMoney(profitAmountPageSum) }}</span>
        </div>
        <p class="prev-mine-footer-sum__meta">共 {{ recordsTotal }} 笔</p>
      </footer>
      <div class="prev-mine-pager" role="toolbar">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="prev-mine-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  fetchMyApprovedSettlements,
  fetchMyPendingReviewSettlements,
  fetchMyRejectedSettlements,
  fetchSettlementReviewAll,
} from '@/api/settlement'
import { parsePageResponse } from '@/utils/pagination'
import { settlementListMetaRest } from '@/utils/settlementDisplay'
import { formatMoney, formatSettlementStatus, settlementStatusTagType } from '@/utils/format'

const REVIEW_SCOPES = ['pending', 'approved', 'rejected', 'all']

/** 与 query.scope 一致，供下拉与请求分支 */
const reviewScopeFilterOptions = [
  { text: '待审核', value: 'pending' },
  { text: '已通过', value: 'approved' },
  { text: '已拒绝', value: 'rejected' },
  { text: '全部', value: 'all' },
]

const route = useRoute()
const router = useRouter()

function reviewScopeFromQuery() {
  const raw = route.query.scope
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw ?? '').trim()
  if (REVIEW_SCOPES.includes(s)) return s
  return 'pending'
}

const reviewScope = ref(reviewScopeFromQuery())

function queryEquals(nextQuery) {
  return JSON.stringify({ ...route.query }) === JSON.stringify({ ...nextQuery })
}

watch(reviewScope, (val) => {
  page.value = 1
  list.value = []
  loaded.value = false
  finished.value = false
  const q = { ...route.query }
  if (val === 'pending') {
    delete q.scope
  } else {
    q.scope = val
  }
  if (!queryEquals(q)) {
    router.replace({ name: 'PendingReviewSettlements', query: q })
  }
})

watch(
  () => route.query.scope,
  () => {
    const next = reviewScopeFromQuery()
    if (next !== reviewScope.value) {
      reviewScope.value = next
    }
  },
)

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
const recordsTotal = ref(0)

const profitAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => {
    const n = Number(amountField(row))
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0),
)

const profitSumLabel = computed(() => {
  if (
    !hasMore.value &&
    recordsTotal.value > 0 &&
    list.value.length === recordsTotal.value
  ) {
    return '上报利润合计'
  }
  return '本页上报利润合计'
})

function amountField(item) {
  return item.profitAmount ?? item.payAmount ?? 0
}

function cellTitle(row) {
  const nick = String(row?.reportUserNickname ?? '').trim()
  if (nick) return `利润来源 · ${nick}`
  return row?.id != null ? `结算 #${row.id}` : '—'
}

function reviewLabel(row) {
  const v = amountField(row)
  const n = Number(v)
  const profit =
    v === null || v === undefined || v === ''
      ? '上报利润：—'
      : `上报利润：${Number.isFinite(n) ? formatMoney(n) : String(v).trim()}`
  const rest = String(settlementListMetaRest(row) ?? '').trim()
  return rest ? `${profit} · ${rest}` : profit
}

function goDetail(row) {
  if (row?.id != null) {
    router.push({ name: 'SettlementDetailByRow', params: { rowId: String(row.id) } })
  }
}

async function fetchPage(p) {
  const params = { page: p, pageSize: pageSize.value }
  let raw
  if (reviewScope.value === 'approved') {
    raw = await fetchMyApprovedSettlements(params)
  } else if (reviewScope.value === 'rejected') {
    raw = await fetchMyRejectedSettlements(params)
  } else if (reviewScope.value === 'all') {
    raw = await fetchSettlementReviewAll(params)
  } else {
    raw = await fetchMyPendingReviewSettlements(params)
  }
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = parsed.list ?? []
  hasMore.value = parsed.hasMore
  // 翻页仅由底部按钮驱动；若 finished 随 hasMore 为 false，van-list 会反复 @load 且始终请求同一 page
  finished.value = true
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
.prev-mine {
  min-width: 0;
}
.prev-mine-filter {
  margin: 0 0 4px;
  background: #fff;
}
.prev-mine-filter :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
.prev-mine-wrap {
  min-height: 40px;
  box-sizing: border-box;
  margin-top:0px;
}
.prev-mine-wrap--docked {
  /* 汇总条 + 分页 + 安全区（与待支付列表底栏一致） */
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.prev-mine-bottom-dock {
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
.prev-mine-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
  border: none;
}
.prev-mine-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.prev-mine-footer-sum__label {
  font-size: 14px;
  color: #646566;
}
.prev-mine-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.prev-mine-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.prev-mine-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.prev-mine-pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
