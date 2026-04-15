<template>
  <div>
    <AppHeader title="待支付给上级" />
    <p class="intro">以下为需向直属上级完成划转并等待逐级结算的待办（资金流仅指向直属上级）。</p>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" style="margin-top: 8px;">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <van-cell
          v-for="item in list"
          :key="item.id"
          :title="settlementListTitle(item)"
          is-link
          :to="detailTo(item)"
        >
          <template #label>
            <div class="meta-row">
              <van-tag :type="settlementStatusTagType(item.status)" plain round class="meta-row__tag">
                {{ formatSettlementStatus(item.status) }}
              </van-tag>
              <span class="meta-row__rest">{{ settlementListMetaRest(item) }}</span>
            </div>
            <!-- <van-button
              v-if="rootReportIdOf(item) != null"
              class="meta-row__flow"
              size="small"
              type="primary"
              plain
              round
              @click.stop="goProfitFlow(item)"
            >
              查看链路
            </van-button> -->
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchMyPendingPaySettlements } from '@/api/settlement'
import { parsePageResponse } from '@/utils/pagination'
import { settlementListTitle, settlementListMetaRest } from '@/utils/settlementDisplay'
import { formatMoney, formatSettlementStatus, settlementStatusTagType } from '@/utils/format'

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
  return item.payAmount ?? item.payableAmount ?? item.amount ?? item.profitAmount ?? 0
}

function rootReportIdOf(item) {
  const v = item.reportId ?? item.report_id ?? item.rootReportId ?? item.root_report_id
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function detailTo(item) {
  const rid = rootReportIdOf(item)
  if (rid != null) return { name: 'SettlementDetail', params: { id: String(rid) } }
  return undefined
}

function goProfitFlow(item) {
  const rid = rootReportIdOf(item)
  if (rid == null) return
  router.push({ name: 'ProfitFlowDetail', params: { rootReportId: String(rid) } })
}

async function fetchPage(p) {
  const raw = await fetchMyPendingPaySettlements({ page: p, pageSize: pageSize.value })
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
.meta-row__flow {
  margin-top: 8px;
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
