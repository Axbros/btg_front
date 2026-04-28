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
              @click="openDetail(row)"
              @keydown.enter.prevent="openDetail(row)"
              @keydown.space.prevent="openDetail(row)"
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

    <van-popup v-model:show="detailShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="detail-popup">
        <div class="detail-popup__title">变更详情</div>
        <van-loading v-if="detailLoading" class="detail-popup__loading" vertical>加载中…</van-loading>
        <template v-else>
          <div class="detail-popup__transition">
            从 {{ modeText(detailBefore.commissionModeDesc) }} -> {{ modeText(detailAfter.commissionModeDesc) }}
          </div>
          <van-cell-group title="变更前" inset>
            <van-cell title="模式" :value="modeText(detailBefore.commissionModeDesc)" />
            <van-cell title="兜底比例" :value="formatRate(detailBefore.guaranteeRatio)" />
            <van-cell title="不兜底比例" :value="formatRate(detailBefore.nonGuaranteeRatio)" />
            <van-cell title="生效时间" :value="formatDateTime(detailBefore.activeAt)" />
          </van-cell-group>
          <van-cell-group title="变更后" inset class="detail-popup__group-gap">
            <van-cell title="模式" :value="modeText(detailAfter.commissionModeDesc)" />
            <van-cell title="兜底比例" :value="formatRate(detailAfter.guaranteeRatio)" />
            <van-cell title="不兜底比例" :value="formatRate(detailAfter.nonGuaranteeRatio)" />
            <van-cell title="提交时间" :value="formatDateTime(detailAfter.submitTime)" />
          </van-cell-group>
          <div v-if="detailIsPending" class="detail-popup__actions">
            <van-button block round type="primary" plain @click="openAction('approve')">同意</van-button>
            <van-button block round type="danger" plain @click="openAction('reject')">拒绝</van-button>
            <van-button block round @click="detailShow = false">关闭</van-button>
          </div>
          <div v-else class="detail-popup__actions">
            <van-button block round @click="detailShow = false">关闭</van-button>
          </div>
        </template>
      </div>
    </van-popup>

    <van-popup v-model:show="actionShow" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="action-popup">
        <div class="action-popup__title">{{ actionTitle }}</div>
        <p class="action-popup__hint">确认后将提交审核结果，remark 可选。</p>
        <van-cell-group inset>
          <van-field
            v-model="actionRemark"
            rows="3"
            autosize
            type="textarea"
            maxlength="300"
            label="remark"
            placeholder="可选"
            show-word-limit
          />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="actionShow = false">取消</van-button>
          <van-button
            block
            round
            :type="actionKind === 'reject' ? 'danger' : 'primary'"
            :loading="actionSubmitting"
            @click="submitAction"
          >
            确认{{ actionKind === 'reject' ? '拒绝' : '同意' }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  approveModeChange,
  fetchModeChangeDetail,
  fetchPendingModeAudits,
  rejectModeChange,
} from '@/api/profitConfig'
import { useDashboardStore } from '@/stores/dashboard'
import { formatDateTime, formatRate } from '@/utils/format'
import { parsePageResponse } from '@/utils/pagination'

const router = useRouter()
const dashboardStore = useDashboardStore()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const loaded = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const recordsTotal = ref(0)

const detailShow = ref(false)
const detailLoading = ref(false)
const detailData = ref({})
const currentDetailId = ref(null)

const actionShow = ref(false)
const actionKind = ref('approve')
const actionTarget = ref(null)
const actionRemark = ref('')
const actionSubmitting = ref(false)

const detailBefore = computed(() => {
  const d = detailData.value
  return d && typeof d === 'object' ? d.beforeActiveConfig ?? {} : {}
})
const detailAfter = computed(() => {
  const d = detailData.value
  return d && typeof d === 'object' ? d.afterPendingConfig ?? {} : {}
})

const actionTitle = computed(() => (actionKind.value === 'reject' ? '拒绝变更申请' : '同意变更申请'))
const countSumLabel = computed(() => {
  const onOnePage = !hasMore.value && recordsTotal.value > 0 && list.value.length === recordsTotal.value
  return onOnePage ? '待审核合计' : '本页待审核数'
})
const detailIsPending = computed(() => {
  const s = detailData.value?.auditStatus
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  return key === 'PENDING' || Number(s) === 1
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

function formatAuditStatus(s) {
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  if (key === 'PENDING' || Number(s) === 1) return '待审核'
  if (key === 'APPROVED' || Number(s) === 2) return '已通过'
  if (key === 'REJECTED' || Number(s) === 3) return '已拒绝'
  return txt(s)
}

function auditStatusTagType(s) {
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  if (key === 'APPROVED' || Number(s) === 2) return 'success'
  if (key === 'REJECTED' || Number(s) === 3) return 'danger'
  if (key === 'PENDING' || Number(s) === 1) return 'warning'
  return 'default'
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

function isConflictErr(e) {
  const code = Number(e?.code ?? e?.httpStatus)
  return code === 409
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

async function openDetail(row) {
  const id = pendingId(row)
  if (id == null) {
    showToast('无效配置 ID')
    return
  }
  detailShow.value = true
  detailLoading.value = true
  detailData.value = {}
  currentDetailId.value = id
  try {
    detailData.value = await fetchModeChangeDetail(id, { skipGlobalToast: true })
  } catch (e) {
    detailData.value = {}
    if (isForbiddenErr(e)) {
      showToast('无权限访问，正在返回')
      detailShow.value = false
      backOrHome()
      return
    }
    toastErrorWithFallback(e, '详情加载失败')
    detailShow.value = false
  } finally {
    detailLoading.value = false
  }
}

function openAction(kind) {
  const id = currentDetailId.value ?? pendingId(detailData.value)
  if (id == null) {
    showToast('无效配置 ID')
    return
  }
  actionKind.value = kind
  actionTarget.value = { pendingConfigId: id }
  actionRemark.value = ''
  actionShow.value = true
}

async function submitAction() {
  const id = pendingId(actionTarget.value)
  if (id == null) {
    showToast('无效配置 ID')
    return
  }
  actionSubmitting.value = true
  try {
    const remark = actionRemark.value.trim()
    const body = remark ? { remark } : {}
    if (actionKind.value === 'reject') {
      await rejectModeChange(id, body, { skipGlobalToast: true })
      showToast('已拒绝')
    } else {
      await approveModeChange(id, body, { skipGlobalToast: true })
      showToast('已同意')
    }
    actionShow.value = false
    detailShow.value = false
    await fetchList()
    void dashboardStore.fetchPendingSummary({ silent: true })
  } catch (e) {
    if (isForbiddenErr(e)) {
      showToast('无权限访问，正在返回')
      actionShow.value = false
      backOrHome()
      return
    }
    if (isConflictErr(e)) {
      toastErrorWithFallback(e, '当前记录已非待审核状态')
      await fetchList()
      return
    }
    toastErrorWithFallback(e, '提交失败，请稍后重试')
  } finally {
    actionSubmitting.value = false
  }
}

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchList()
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
.detail-popup {
  padding: 12px 0 calc(20px + env(safe-area-inset-bottom, 0px));
}
.detail-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 10px;
}
.detail-popup__loading {
  padding: 24px 0;
}
.detail-popup__transition {
  margin: 0 16px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #1989fa;
  background: #f0f7ff;
}
.detail-popup__group-gap {
  margin-top: 8px;
}
.detail-popup__actions {
  padding: 14px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-popup {
  padding: 12px 0 calc(20px + env(safe-area-inset-bottom, 0px));
}
.action-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.action-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
.action-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
</style>
