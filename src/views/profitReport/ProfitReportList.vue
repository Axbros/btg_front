<template>
  <div class="profit-report-shell">
    <AppHeader title="我的利润上报记录" />
    <div class="profit-report-shell__scroll profit-report-shell__list profit-report-list__body">
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
      <div class="pager">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ProfitRecordCard from '@/components/ProfitRecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchMyProfitReports } from '@/api/profitReport'
import { parsePageResponse } from '@/utils/pagination'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

function rowKey(item, idx) {
  return String(item.settlementId ?? item.id ?? `row-${idx}`)
}

async function fetchPage(p) {
  const raw = await fetchMyProfitReports({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = rows
  hasMore.value = more
  finished.value = !more
  loaded.value = true
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
  padding-top: 12px;
  padding-bottom: env(safe-area-inset-bottom);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 24px;
}
.pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
