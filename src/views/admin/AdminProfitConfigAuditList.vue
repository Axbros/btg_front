<template>
  <div class="profit-config-audits">
    <AppHeader title="分润模式变更审核" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="profit-config-audits__wrap" :class="{ 'profit-config-audits__wrap--docked': loaded }">
        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <van-cell-group v-if="list.length" inset :border="false" class="prev-mine-list-group">
            <van-cell
              v-for="(row, idx) in list"
              :key="row.pendingConfigId ?? idx"
              :title="cellTitle(row)"
              :label="cellLabel(row)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goDetail(row)"
              @keydown.enter.prevent="goDetail(row)"
              @keydown.space.prevent="goDetail(row)"
            />
          </van-cell-group>
          <EmptyState v-if="!loading && !list.length && loaded" description="暂无待审核分润模式变更" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="profit-config-audits__dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0 || list.length" class="profit-config-audits__sum" aria-label="列表汇总">
        <div class="profit-config-audits__sum-row">
          <span class="profit-config-audits__sum-label">{{ countSumLabel }}</span>
          <span class="profit-config-audits__sum-value">{{ list.length }}</span>
        </div>
        <p v-if="recordsTotal > 0" class="profit-config-audits__sum-meta">共 {{ recordsTotal }} 条</p>
      </footer>
      <div class="profit-config-audits__pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
        <span class="profit-config-audits__pager-text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchPendingModeAudits } from '@/api/profitConfig'
import { parsePageResponse } from '@/utils/pagination'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const loaded = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const recordsTotal = ref(0)

const countSumLabel = computed(() => {
  const onOnePage = !hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value
  return onOnePage ? '待审核合计' : '本页待审核数'
})

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function modeText(v) {
  return txt(v)
}

function cellTitle(row) {
  const parent = txt(row?.parentNickname ?? row?.parentUserId)
  const child = txt(row?.childNickname ?? row?.childUserId)
  return `${parent} 对 ${child} 的分润模式切换`
}

function cellLabel(row) {
  return modeText(row?.commissionModeDesc)
}

function pendingId(row) {
  const id = row?.pendingConfigId ?? row?.id
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

function isForbiddenErr(e) {
  const code = Number(e?.code ?? e?.httpStatus)
  if (code === 401 || code === 403) return true
  const msg = String(e?.message ?? '').toLowerCase()
  return msg.includes('unauthorized') || msg.includes('forbidden')
}

function backOrHome() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/home')
}

function toastErrorWithFallback(e, fallback = '操作失败，请稍后重试') {
  const msg = String(e?.message ?? '').trim()
  showToast(msg || fallback)
}

async function fetchList() {
  try {
    const raw = await fetchPendingModeAudits(
      { page: page.value, size: pageSize.value },
      { skipGlobalToast: true },
    )
    const parsed = parsePageResponse(raw, pageSize.value)
    list.value = Array.isArray(parsed.list) ? parsed.list : []
    hasMore.value = Boolean(parsed.hasMore)
    const t = parsed.total != null ? Number(parsed.total) : 0
    recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : list.value.length
    loaded.value = true
    finished.value = true
  } catch (e) {
    list.value = []
    hasMore.value = false
    recordsTotal.value = 0
    finished.value = true
    loaded.value = true
    if (isForbiddenErr(e)) {
      showToast('无权限访问，正在返回')
      backOrHome()
      return
    }
    toastErrorWithFallback(e, '加载失败，请稍后重试')
  }
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchList()
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  try {
    await fetchList()
  } finally {
    refreshing.value = false
  }
}

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchList()
}

function goDetail(row) {
  const id = pendingId(row)
  if (id == null) {
    showToast('无效配置 ID')
    return
  }
  router.push({ name: 'AdminProfitConfigAuditDetail', params: { id: String(id) } })
}
</script>

<style scoped>
.profit-config-audits {
  min-width: 0;
}
.profit-config-audits__wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.profit-config-audits__wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
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
.profit-config-audits__dock {
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
.profit-config-audits__sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.profit-config-audits__sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.profit-config-audits__sum-label {
  font-size: 14px;
  color: #646566;
}
.profit-config-audits__sum-value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.profit-config-audits__sum-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.profit-config-audits__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.profit-config-audits__pager-text {
  font-size: 13px;
  color: #646566;
}
</style>
