<template>
  <div class="assigned-list">
    <AppHeader title="资方补仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="assigned-list__wrap" :class="{ 'assigned-list__wrap--docked': loaded }">
        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <van-cell-group v-if="list.length" inset :border="false" class="prev-mine-list-group">
            <van-cell
              v-for="(row, idx) in list"
              :key="row.id ?? idx"
              :title="applyNoText(row)"
              :label="replenishmentAssignedLabel(row)"
              :border="false"
              is-link
              @click="goDetail(row)"
            >
              <template #value>
                <van-tag :type="replenishmentListStatusTagType(row)" plain round>
                  {{ formatReplenishmentListStatus(row) }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <van-empty v-if="!loading && !list.length && loaded" description="暂无资方补仓单" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="assigned-list__dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0 || list.length" class="assigned-list__sum" aria-label="列表汇总">
        <div class="assigned-list__sum-row">
          <span class="assigned-list__sum-label">{{ replenishSumLabel }}</span>
          <span class="assigned-list__sum-value">{{ formatMoney(replenishAmountPageSum) }}</span>
        </div>
        <p v-if="recordsTotal > 0" class="assigned-list__sum-meta">共 {{ recordsTotal }} 条</p>
      </footer>
      <div class="assigned-list__pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
        <span class="assigned-list__pager-text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { getAssignedReplenishments } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatReplenishmentListStatus, replenishmentListStatusTagType } from '@/utils/format'

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

const replenishAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => {
    const n = Number(row?.replenishAmount ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0),
)

const replenishSumLabel = computed(() => {
  const onOnePage =
    !hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value
  if (onOnePage) return '补仓额度合计'
  return '本页补仓额度合计'
})

function applyNoText(row) {
  const no = row?.applyNo
  if (no != null && String(no).trim() !== '') return String(no).trim()
  return row?.id != null ? `（暂无单号）#${row.id}` : '—'
}

/** 仅列表接口字段，与管理员待审核列表 replenishmentReviewLabel 一致 */
function replenishmentAssignedLabel(row) {
  const amt = formatMoney(Number(row?.replenishAmount ?? 0))
  return `补仓额度：${amt}`
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'ReplenishmentMineDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await getAssignedReplenishments({ page: p, size: pageSize.value })
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = parsed.list ?? []
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  recordsTotal.value = Number(parsed.total) || 0
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

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchPage(page.value)
}
</script>

<style scoped>
.assigned-list {
  min-width: 0;
  padding-bottom: 8px;
}
.assigned-list__wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.assigned-list__wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.assigned-list__dock {
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
.assigned-list__sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.assigned-list__sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.assigned-list__sum-label {
  font-size: 14px;
  color: #646566;
}
.assigned-list__sum-value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.assigned-list__sum-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.assigned-list__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.assigned-list__pager-text {
  font-size: 13px;
  color: #646566;
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
</style>
