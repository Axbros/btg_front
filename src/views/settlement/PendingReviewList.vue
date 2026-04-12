<template>
  <div>
    <AppHeader title="待审核下级结算" />
    <!-- <p class="intro">直属下级上报利润并提交结算凭证后，由您审核；通过后由系统逐级向上推进，拒绝则本链路暂停。</p> -->
    <van-tabs v-model:active="activeTab" shrink sticky>
      <van-tab title="待审核" name="pending" />
      <van-tab title="已通过" name="approved" />
      <van-tab title="已拒绝" name="rejected" />
    </van-tabs>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="margin-top: 8px;">
      <van-list
        :key="activeTab"
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell
          v-for="item in list"
          :key="item.id"
          :title="titleLine(item)"
          is-link
          :to="detailTo(item)"
        >
          <template #label>
            <div class="meta-row">
              <van-tag :type="settlementStatusTagType(item.status)" plain round class="meta-row__tag">
                {{ formatSettlementStatus(item.status) }}
              </van-tag>
              <span class="meta-row__rest">{{ metaRestLine(item) }}</span>
            </div>
          </template>
          <template #value>
            <span class="amt">{{ formatMoney(amountField(item)) }}</span>
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
import {
  fetchMyApprovedSettlements,
  fetchMyPendingReviewSettlements,
  fetchMyRejectedSettlements,
} from '@/api/settlement'
import { parsePageResponse } from '@/utils/pagination'
import {
  formatMoney,
  formatDateTime,
  formatSettlementStatus,
  settlementStatusTagType,
} from '@/utils/format'

/** pending | approved | rejected — 分别对应 pending-review / approved / rejected */
const activeTab = ref('pending')
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

function titleLine(item) {
  const no = item.profitRecordNo ?? item.recordNo ?? item.settlementNo
  if (no != null && String(no).trim() !== '') return String(no)
  return item.id != null ? `结算 #${item.id}` : '—'
}

function metaRestLine(item) {
  const parts = []
  const nick = item.subordinateNickname ?? item.userNickname ?? item.userMobile
  if (nick) parts.push(String(nick))
  if (item.submitTime ?? item.createdTime) {
    parts.push(formatDateTime(item.submitTime ?? item.createdTime))
  }
  return parts.join(' · ')
}

function amountField(item) {
  return item.profitAmount ?? item.payAmount ?? 0
}

function detailTo(item) {
  return item.id != null
    ? { name: 'SettlementDetailByRow', params: { rowId: String(item.id) } }
    : undefined
}

async function fetchPage(p) {
  const params = { page: p, pageSize: pageSize.value }
  let raw
  if (activeTab.value === 'approved') {
    raw = await fetchMyApprovedSettlements(params)
  } else if (activeTab.value === 'rejected') {
    raw = await fetchMyRejectedSettlements(params)
  } else {
    raw = await fetchMyPendingReviewSettlements(params)
  }
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

watch(activeTab, () => {
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
.intro {
  margin: 10px 16px 0;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 2px;
}
.meta-row__tag {
  flex-shrink: 0;
}
.meta-row__rest {
  font-size: 12px;
  color: #969799;
  line-height: 1.4;
}
.amt {
  font-weight: 600;
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
