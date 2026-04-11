<template>
  <div>
    <AppHeader title="下级申报审核" />
    <van-tabs v-model:active="activeStatus" shrink sticky>
      <van-tab title="全部" name="all" />
      <van-tab title="待审核" name="PENDING" />
      <van-tab title="已通过" name="APPROVED" />
      <van-tab title="已拒绝" name="REJECTED" />
    </van-tabs>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="margin-top: 8px;">
      <van-list
        :key="activeStatus"
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="item in list"
          :key="item.id"
          :title="listTitle(item)"
          is-link
          :to="{ name: 'ReferrerProfitDetail', params: { id: item.id } }"
        >
          <template #label>
            <span class="list__meta">{{ listMetaLine(item) }}</span>
          </template>
          <template #value>
            <span class="list__amount">{{ formatMoney(item.profitAmount) }}</span>
          </template>
        </van-cell>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchReferrerProfitRecords } from '@/api/profit'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime, formatProfitRecordStatus } from '@/utils/format'

const activeStatus = ref('all')
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

function statusQuery() {
  return activeStatus.value === 'all' ? undefined : activeStatus.value
}

/** 列表项：id、recordNo、userMobile、profitAmount、commissionRate、netAmount、status、submitTime；可无 userId（旧数据） */
function listTitle(item) {
  const no = item.recordNo
  if (no != null && String(no).trim() !== '') return String(no)
  if (item.id != null) return `申报 #${item.id}`
  return '—'
}

function listMetaLine(item) {
  const parts = [formatProfitRecordStatus(item.status)]
  const mobile = item.userMobile != null ? String(item.userMobile).trim() : ''
  // if (mobile) {
  //   parts.push(`手机 ${mobile}`)
  // } else if (item.userId != null) {
  //   parts.push(`用户 ID ${item.userId}`)
  // }
  if (item.submitTime) {
    parts.push(formatDateTime(item.submitTime))
  }
  return parts.join(' · ')
}

async function fetchPage(p) {
  const raw = await fetchReferrerProfitRecords({
    page: p,
    pageSize: pageSize.value,
    status: statusQuery(),
  })
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

watch(activeStatus, () => {
  page.value = 1
  list.value = []
  loaded.value = false
  finished.value = false
})

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
.list__meta {
  font-size: 12px;
  color: #969799;
  line-height: 1.4;
}
.list__amount {
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
