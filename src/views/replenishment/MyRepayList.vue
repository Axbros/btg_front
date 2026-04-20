<template>
  <div class="repay-mine">
    <AppHeader title="归仓">
      <template #right>
        <van-icon
          name="balance-list-o"
          class="repay-mine-header-icon"
          role="button"
          tabindex="0"
          aria-label="提交归仓申请"
          @click="goSubmitRepay"
          @keydown.enter.prevent="goSubmitRepay"
          @keydown.space.prevent="goSubmitRepay"
        />
      </template>
    </AppHeader>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="repay-mine-wrap" :class="{ 'repay-mine-wrap--docked': loaded }">
        <!-- <p v-if="list.length || loaded" class="repay-mine-list-title">归仓申请记录</p> -->
        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <van-cell-group v-if="list.length" inset :border="false" class="repay-mine-list-group">
            <van-cell
              v-for="(row, idx) in list"
              :key="rowKey(row, idx)"
              :title="repayNoTitle(row)"
              :label="repayAmountLabel(row)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goDetail(row)"
              @keydown.enter.prevent="goDetail(row)"
            >
              <template #value>
                <van-tag :type="repayStatusTagType(row.status)" plain round>
                  {{ formatRepayStatus(row.status) }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <EmptyState v-if="!loading && !list.length && loaded" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="repay-mine-bottom-dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0" class="repay-mine-footer-sum" aria-label="归仓金额汇总">
        <div class="repay-mine-footer-sum__row">
          <span class="repay-mine-footer-sum__label">{{ amountSumLabel }}</span>
          <span class="repay-mine-footer-sum__value">{{ formatMoney(repayPageSum) }}</span>
        </div>
        <p class="repay-mine-footer-sum__meta">共 {{ recordsTotal }} 笔</p>
      </footer>
      <div class="repay-mine-pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="repay-mine-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getMyRepayApplyList } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatRepayStatus, repayStatusTagType } from '@/utils/format'

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

/** 接口 brief：repayAmount；兼容旧字段 approvedAmount */
function repayAmountNum(row) {
  const n = Number(row?.repayAmount ?? row?.approvedAmount ?? 0)
  return Number.isFinite(n) ? n : 0
}

const repayPageSum = computed(() => list.value.reduce((sum, row) => sum + repayAmountNum(row), 0))

const amountSumLabel = computed(() => {
  if (!hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value) {
    return '归仓金额合计'
  }
  return '本页归仓金额合计'
})

function goSubmitRepay() {
  router.push({ name: 'RepayApply' })
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function rowKey(row, idx) {
  return String(row.id ?? row.replenishApplyId ?? `row-${idx}`)
}

/** 列表项标题：归仓单号；兼容旧 replenishApplyNo */
function repayNoTitle(row) {
  const no = row?.repayNo ?? row?.replenishApplyNo
  if (no != null && String(no).trim() !== '') return String(no).trim()
  if (row?.id != null) return `申请 #${row.id}`
  return '—'
}

function repayAmountLabel(row) {
  return `归仓金额：${formatMoney(repayAmountNum(row))}`
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await getMyRepayApplyList({ page: p, size: pageSize.value })
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
.repay-mine {
  min-width: 0;
}
.repay-mine-wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.repay-mine-wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.repay-mine-bottom-dock {
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
.repay-mine-header-icon {
  display: block;
  font-size: 22px;
  color: #1989fa;
  padding: 4px 10px 4px 4px;
  margin-right: -6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.repay-mine-list-title {
  margin: 16px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.repay-mine-list-group {
  margin-top: 4px;
  background: transparent;
}
.repay-mine-list-group :deep(.van-cell) {
  margin: 0 0 8px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.repay-mine-list-group :deep(.van-cell:last-of-type) {
  margin-bottom: 0;
}
.repay-mine-list-group :deep(.van-cell__title) {
  flex: 1.2;
  min-width: 0;
  font-weight: 500;
}
.repay-mine-list-group :deep(.van-cell__value) {
  flex-shrink: 0;
}
.repay-mine-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.repay-mine-pager__text {
  font-size: 13px;
  color: #646566;
}
.repay-mine-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
  border: none;
}
.repay-mine-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.repay-mine-footer-sum__label {
  font-size: 14px;
  color: #646566;
}
.repay-mine-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.repay-mine-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
</style>
