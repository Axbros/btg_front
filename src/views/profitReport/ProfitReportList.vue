<template>
  <div class="profit-report-shell">
    <AppHeader title="利润记录" />
    <div class="profit-report-shell__scroll profit-report-shell__list profit-report-list__body">
      <div :class="['pr-list-content', { 'pr-list-content--docked': loaded }]">
        <van-pull-refresh v-model="refreshing" class="profit-report-shell__pull" @refresh="onRefresh">
          <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
            <ProfitRecordCard
              v-for="(item, idx) in list"
              :key="rowKey(item, idx)"
              :item="item"
              link-to-settlement
              show-distribution-link
            />
            <EmptyState v-if="!loading && !list.length && loaded" />
          </van-list>
        </van-pull-refresh>
      </div>
    </div>

    <div v-show="loaded" class="pr-list-bottom-dock" aria-label="底部汇总与分页">
      <footer v-if="list.length" class="pr-list-footer-sum" aria-label="本页利润汇总">
        <div class="pr-list-footer-sum__row">
          <div class="pr-list-footer-sum__left">
            <span class="pr-list-footer-sum__label">上报总利润</span>
            <span v-if="showPageNote" class="pr-list-footer-sum__note">（本页）</span>
          </div>
          <span class="pr-list-footer-sum__value">{{ pageTotalProfitText }}</span>
        </div>
        <p v-if="recordsTotal > 0" class="pr-list-footer-sum__meta">共 {{ recordsTotal }} 条</p>
      </footer>
      <div class="pr-list-pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="pr-list-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ProfitRecordCard from '@/components/ProfitRecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchMyProfitReports } from '@/api/profitReport'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
/** 接口返回的列表总条数，用于与补仓页一致的「共 N 条」 */
const recordsTotal = ref(0)

const pageTotalProfit = computed(() =>
  list.value.reduce((sum, item) => {
    const n = Number(item.profitAmount ?? item.profitReportAmount)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0),
)

const pageTotalProfitText = computed(() => formatMoney(pageTotalProfit.value))

const showPageNote = computed(() => hasMore.value || page.value > 1)

function rowKey(item, idx) {
  return String(item.settlementId ?? item.id ?? `row-${idx}`)
}

async function fetchPage(p) {
  const raw = await fetchMyProfitReports({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more, total } = parsePageResponse(raw, pageSize.value)
  list.value = rows
  hasMore.value = more
  finished.value = !more
  loaded.value = true
  const t = total != null ? Number(total) : 0
  recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : 0
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
.profit-report-list__body {
  min-width: 0;
}
.pr-list-content {
  box-sizing: border-box;
  min-height: 0;
  padding-top: 12px;
}
.pr-list-content--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.pr-list-bottom-dock {
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
.pr-list-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
  border: none;
}
.pr-list-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.pr-list-footer-sum__left {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
}
.pr-list-footer-sum__label {
  font-size: 14px;
  color: #646566;
  font-weight: 400;
}
.pr-list-footer-sum__note {
  font-size: 12px;
  color: #969799;
  font-weight: 400;
}
.pr-list-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #ee0a24;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.pr-list-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.pr-list-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.pr-list-pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
