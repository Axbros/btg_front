<template>
  <div class="prev-mine">
    <AppHeader title="下级结算" />
    <van-tabs v-model:active="activeTab" shrink sticky>
      <van-tab title="待审核" name="pending" />
      <van-tab title="已通过" name="approved" />
      <van-tab title="已拒绝" name="rejected" />
      <van-tab title="全部" name="all" />
    </van-tabs>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="prev-mine-wrap" :class="{ 'prev-mine-wrap--docked': loaded }">
        <van-list
          :key="activeTab"
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

    <div v-show="loaded" class="prev-mine-bottom-dock" aria-label="分页">
      <div class="prev-mine-pager" role="toolbar">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="prev-mine-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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

/** pending | approved | rejected | all */
const activeTab = ref('pending')
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
const router = useRouter()

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
  if (activeTab.value === 'approved') {
    raw = await fetchMyApprovedSettlements(params)
  } else if (activeTab.value === 'rejected') {
    raw = await fetchMyRejectedSettlements(params)
  } else if (activeTab.value === 'all') {
    raw = await fetchSettlementReviewAll(params)
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
.prev-mine {
  min-width: 0;
}
.prev-mine-wrap {
  min-height: 40px;
  box-sizing: border-box;
  margin-top: 8px;
}
.prev-mine-wrap--docked {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
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
