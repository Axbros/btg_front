<template>
  <div>
    <AppHeader title="待审核补仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <van-cell-group v-if="list.length" inset>
          <van-cell
            v-for="(row, idx) in list"
            :key="row.id ?? idx"
            is-link
            :to="detailRoute(row)"
          >
            <template #title>
              <span class="pending-title">{{ pendingListTitle(row) }}</span>
            </template>
            <!-- <template #label>
              <span class="pending-meta">{{ pendingListMeta(row) }}</span>
            </template> -->
            <template #value>
              <span class="pending-amt">{{ formatMoney(pendingReplenishAmount(row)) }}</span>
            </template>
          </van-cell>
        </van-cell-group>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchAdminPendingReplenishments } from '@/api/adminReplenishment'
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

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function pendingNick(row) {
  return txt(row?.nickname ?? row?.userNickname)
}

function pendingMobile(row) {
  return txt(row?.mobile ?? row?.userMobile)
}

/** 列表标题：nickname#mobile，缺省回退为申请 #id */
function pendingListTitle(row) {
  const nick = pendingNick(row)
  const mob = pendingMobile(row)
  if (nick !== '—' && mob !== '—') return `${nick}#${mob}`
  if (nick !== '—') return nick
  if (mob !== '—') return mob
  return row?.id != null ? `申请 #${row.id}` : '—'
}

function pendingListMeta(row) {
  const id = row?.id != null ? String(row.id) : '—'
  return `ID ${id}`
}

function pendingReplenishAmount(row) {
  return row?.replenishAmount ?? 0
}

function detailRoute(row) {
  const id = row?.id
  if (id == null) return undefined
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return { name: 'AdminReplenishmentDetail', params: { id: String(n) } }
}

async function fetchPage(p) {
  const raw = await fetchAdminPendingReplenishments({ page: p, size: pageSize.value })
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

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchPage(page.value)
}
</script>

<style scoped>
.pending-title {
  font-size: 15px;
  color: #323233;
}
.pending-meta {
  font-size: 12px;
  color: #969799;
}
.pending-amt {
  font-weight: 600;
  color: #323233;
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
