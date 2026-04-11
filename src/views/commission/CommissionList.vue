<template>
  <div>
    <AppHeader title="我的佣金流水" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="margin-top: 12px;">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div
          v-for="item in list"
          :key="item.id"
          class="comm-snippet"
          role="button"
          @click="goDetail(item.id)"
        >
          <van-cell-group>
            <van-cell title="申报单号" :value="profitRecordNoLine(item)" is-link/>
            <van-cell title="盈利金额" :value="formatMoney(item.profitAmount)" />
            <!-- <van-cell title="佣金金额" :value="formatMoney(item.commissionAmount)" />
            <van-cell title="分佣比例" :value="formatRate(item.commissionRate)" /> -->
            <!-- <van-cell title="状态" :value="formatCommissionRecordStatus(item.status)" is-link /> -->
          </van-cell-group>
        </div>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页 / 共 {{ total }} 条</span>
      <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchMyCommissions } from '@/api/commission'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatRate, formatCommissionRecordStatus } from '@/utils/format'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hasMore = ref(false)
const loaded = ref(false)

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

function profitRecordNoLine(item) {
  const no = pickStr(item.profitRecordNo, item.recordNo, item.profit_record_no)
  if (no) return no
  return item.profitRecordId != null ? `#${item.profitRecordId}` : '—'
}

function goDetail(id) {
  if (id == null) return
  router.push({ name: 'CommissionDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await fetchMyCommissions({ page: p, size: pageSize.value })
  const { list: rows, total: t, hasMore: more } = parsePageResponse(raw, pageSize.value)
  total.value = t
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
.comm-snippet {
  margin-bottom: 10px;
  cursor: pointer;
}
.comm-snippet:active {
  opacity: 0.92;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 8px 24px;
  flex-wrap: wrap;
}
.pager__text {
  font-size: 12px;
  color: #646566;
}
</style>
