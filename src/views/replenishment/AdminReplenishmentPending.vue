<template>
  <div class="admin-pending">
    <AppHeader title="补仓审核" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="admin-pending__wrap" :class="{ 'admin-pending__wrap--docked': loaded }">
        <div class="admin-pending__filter">
          <van-dropdown-menu>
            <van-dropdown-item v-model="statusFilter" :options="statusFilterOptions" />
          </van-dropdown-menu>
        </div>

        <van-list
          :key="statusFilter"
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <template v-if="listSections.length">
            <template v-for="section in listSections" :key="section.key">
              <!-- <div v-if="section.title" class="section-title">{{ section.title }}</div> -->
              <van-cell-group
                v-if="section.rows.length"
                inset
                :border="false"
                class="prev-mine-list-group"
              >
                <van-cell
                  v-for="(row, idx) in section.rows"
                  :key="`${section.key}-${row.id ?? idx}`"
                  :title="row.applyNo"
                  :label="replenishmentReviewLabel(row)"
                  :border="false"
                  is-link
                  @click="goDetail(row)"
                >
                  <template #value>
                    <van-tag
                      :type="replenishmentStatusTagType(row.status)"
                      plain
                      round
                    >
                      {{ formatAdminReplenishmentStatus(row.status) }}
                    </van-tag>
                  </template>
                </van-cell>
              </van-cell-group>
            </template>
          </template>
          <van-empty v-if="!loading && !listSections.length && loaded" description="暂无资方补仓" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="admin-pending__dock" aria-label="底部统计与分页">
      <footer
        v-if="recordsTotal > 0 || list.length || awaitAssignCount > 0"
        class="admin-pending__sum"
        aria-label="列表汇总"
      >
        <div class="admin-pending__sum-row">
          <span class="admin-pending__sum-label">{{ replenishSumLabel }}</span>
          <span class="admin-pending__sum-value">{{ formatMoney(replenishAmountDisplaySum) }}</span>
        </div>
        <div v-if="statusFilter === '1' && awaitAssignCount > 0" class="admin-pending__sum-row admin-pending__sum-row--sub">
          <span class="admin-pending__sum-label">待转派资方执行用户</span>
          <span class="admin-pending__sum-value admin-pending__sum-value--warn">{{ awaitAssignCount }} 条</span>
        </div>
        <p v-if="recordsTotal > 0" class="admin-pending__sum-meta">共 {{ recordsTotal }} 条{{ recordsMetaHint }}</p>
      </footer>
      <div class="admin-pending__pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
        <span class="admin-pending__pager-text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
      </div>
    </div>

    <van-popup v-model:show="approveShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="action-popup">
        <div class="action-popup__title">通过（同意）</div>
        <p class="action-popup__hint">请上传打款凭证并填写备注，确认后将提交通过。</p>
        <van-cell-group inset>
          <van-field label="打款凭证" readonly placeholder="请上传">
            <template #input>
              <ImageUploadField
                v-model="approveTransferScreenshotUrl"
                upload-type="TRANSFER"
                hint="转账截图（必填）"
              />
            </template>
          </van-field>
          <van-field
            v-model="approveRemark"
            rows="2"
            autosize
            type="textarea"
            maxlength="500"
            label="备注"
            placeholder="选填"
            show-word-limit
          />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="approveShow = false">取消</van-button>
          <van-button block round type="primary" :loading="approveSubmitting" @click="submitApprove">确认通过</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="rejectShow" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="action-popup">
        <div class="action-popup__title">拒绝补仓</div>
        <van-cell-group inset>
          <van-field v-model="rejectRemark" rows="3" autosize type="textarea" maxlength="500" placeholder="拒绝原因（必填）" show-word-limit />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="rejectShow = false">取消</van-button>
          <van-button block round type="danger" :loading="rejectSubmitting" @click="submitReject">确认拒绝</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="assignShow" position="bottom" round :style="{ maxHeight: '85%' }">
      <div class="assign-popup">
        <div class="assign-popup__title">转派资方执行用户</div>
        <van-loading v-if="pickerLoading" class="assign-popup__loading" vertical>加载可选用户…</van-loading>
        <van-cell-group v-else inset>
          <van-field
            :model-value="assignExecutorDisplay"
            readonly
            label="执行人"
            placeholder="请选择资方执行用户"
            is-link
            required
            @click="openAssignExecutorPicker"
          />
          <van-field v-model="assignRemark" label="转派备注" type="textarea" rows="2" autosize maxlength="500" placeholder="选填" show-word-limit />
        </van-cell-group>
        <div class="assign-popup__actions">
          <van-button block round @click="assignShow = false">取消</van-button>
          <van-button block round type="primary" :loading="assignSubmitting" :disabled="pickerLoading" @click="submitAssign">
            确认转派
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="assignExecutorPickerOpen" position="bottom" round teleport="body">
      <van-picker
        v-if="pickerColumns.length"
        show-toolbar
        title="选择执行人"
        :columns="pickerColumns"
        @confirm="onAssignExecutorPickerConfirm"
        @cancel="assignExecutorPickerOpen = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import {
  getAllAdminReplenishments,
  approveReplenishment,
  rejectReplenishment,
  assignReplenishment,
} from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, replenishmentStatusTagType } from '@/utils/format'
import { useAdminReplenishmentAssignPicker } from '@/composables/useAdminReplenishmentAssignPicker'

/** 与后端补仓状态枚举一致（筛选用 value 为字符串） */
const STATUS_FILTER_OPTIONS = [
  { text: '待审核', value: '1' },
  { text: '待转派', value: '2' },
  { text: '待提交', value: '3' },
  { text: '待确认', value: '4' },
  { text: '已退回', value: '5' },
  { text: '补仓成功', value: '6' },
  { text: '已拒绝', value: '7' },
  { text: '已关闭', value: '8' },
  { text: '全部', value: 'all' },
]

const route = useRoute()
const router = useRouter()

const list = ref([])
/** 管理员已通过、状态为 ASSIGNED_TO_CAPITAL 且尚未指定资方执行用户的单（来自 /admin/replenishments/all） */
const awaitAssignList = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const AWAIT_SCAN_PAGE_SIZE = 50
const AWAIT_SCAN_MAX_PAGES = 25

const statusFilterOptions = STATUS_FILTER_OPTIONS

function isValidStatusQuery(v) {
  if (v === 'all') return true
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 8
}

function statusFromQuery() {
  const raw = route.query.status
  if (raw === undefined || raw === null) return '1'
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw).trim()
  if (s === '') return '1'
  if (s === 'all') return 'all'
  if (!isValidStatusQuery(s)) return '1'
  return String(Number(s))
}

const statusFilter = ref(statusFromQuery())

function queryEquals(nextQuery) {
  return JSON.stringify({ ...route.query }) === JSON.stringify({ ...nextQuery })
}

watch(statusFilter, (val) => {
  page.value = 1
  list.value = []
  awaitAssignList.value = []
  loaded.value = false
  finished.value = false
  const q = { ...route.query }
  if (val === 'all') {
    q.status = 'all'
  } else {
    q.status = val
  }
  if (!queryEquals(q)) {
    router.replace({ name: 'AdminPendingReplenishments', query: q })
  }
})

watch(
  () => route.query.status,
  () => {
    const next = statusFromQuery()
    if (next === statusFilter.value) return
    page.value = 1
    list.value = []
    awaitAssignList.value = []
    loaded.value = false
    finished.value = false
    statusFilter.value = next
  },
)

onMounted(() => {
  const raw = route.query.status
  if (raw === undefined || raw === null) return
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw).trim()
  if (s !== '' && !isValidStatusQuery(s)) {
    const q = { ...route.query }
    delete q.status
    router.replace({ name: 'AdminPendingReplenishments', query: q })
  }
})

const currentListSectionTitle = computed(() => {
  const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter.value)
  return opt?.text ?? '补仓单'
})

const listSections = computed(() => {
  const out = []
  if (statusFilter.value === '1') {
    if (list.value.length) {
      out.push({ key: 'pending', title: '待管理员审核', rows: list.value })
    }
    if (awaitAssignList.value.length) {
      out.push({ key: 'awaitAssign', title: '待转派资方执行用户', rows: awaitAssignList.value })
    }
    return out
  }
  if (list.value.length) {
    out.push({ key: 'main', title: currentListSectionTitle.value, rows: list.value })
  }
  return out
})

const awaitAssignCount = computed(() => awaitAssignList.value.length)

const recordsTotal = ref(0)

const replenishAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => {
    const n = Number(row.replenishAmount ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0),
)

const replenishAmountAwaitAssignSum = computed(() => {
  if (statusFilter.value !== '1') return 0
  return awaitAssignList.value.reduce((sum, row) => {
    const n = Number(row.replenishAmount ?? 0)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
})

const replenishAmountDisplaySum = computed(
  () => replenishAmountPageSum.value + replenishAmountAwaitAssignSum.value,
)

const replenishSumLabel = computed(() => {
  const onOnePage =
    !hasMore.value &&
    recordsTotal.value > 0 &&
    list.value.length === recordsTotal.value &&
    (statusFilter.value !== '1' || awaitAssignList.value.length === 0)
  if (onOnePage) {
    return '补仓额度合计'
  }
  return '本页补仓额度合计'
})

const recordsMetaHint = computed(() => {
  if (statusFilter.value === 'all') return ''
  const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter.value)
  return opt ? `（${opt.text}）` : ''
})

function formatAdminReplenishmentStatus(s) {
  const n = Number(s)
  if (!Number.isFinite(n) || n < 1 || n > 8) return '—'
  const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === String(n))
  return opt?.text ?? '—'
}

const rowActionId = ref(null)
const actionKind = ref('')

const approveShow = ref(false)
const rejectShow = ref(false)
const assignShow = ref(false)
const currentRow = ref(null)

const approveTransferScreenshotUrl = ref('')
const approveRemark = ref('')
const rejectRemark = ref('')
const assignRemark = ref('')
const assignExecutorPickerOpen = ref(false)
const {
  pickerLoading,
  assignSelectedUserId,
  pickerColumns,
  assignExecutorDisplay,
  loadExecutorPickerOptions,
  resetAssignSelection,
  applyPickerConfirm,
} = useAdminReplenishmentAssignPicker()
const assignSubmitting = ref(false)
const approveSubmitting = ref(false)
const rejectSubmitting = ref(false)

watch(assignShow, (v) => {
  if (!v) assignExecutorPickerOpen.value = false
})

function txt(v, fallback = '—') {
  if (v == null) return fallback
  const s = String(v).trim()
  return s !== '' ? s : fallback
}

function statusKey(row) {
  const s = row?.status ?? row?.statusCode
  if (s == null || s === '') return ''
  if (typeof s === 'string') return s.trim().toUpperCase().replace(/-/g, '_')
  const n = Number(s)
  if (n === 1) return 'PENDING_ADMIN_REVIEW'
  if (n === 2) return 'ASSIGNED_TO_CAPITAL'
  if (n === 3) return 'PENDING_CAPITAL_SUBMIT'
  if (n === 4) return 'PENDING_APPLICANT_CONFIRM'
  if (n === 5) return 'RETURNED_TO_CAPITAL'
  if (n === 6) return 'SUCCESS'
  if (n === 7) return 'REJECTED'
  if (n === 8) return 'CLOSED'
  return ''
}

function isPendingAdminReview(row) {
  return statusKey(row) === 'PENDING_ADMIN_REVIEW'
}

/** 已通过待指定资方执行用户：ASSIGNED_TO_CAPITAL / 数值 2，且 assignedCapitalUserId 为空 */
function isAwaitingCapitalAssign(row) {
  if (statusKey(row) !== 'ASSIGNED_TO_CAPITAL') return false
  const uid = row?.assignedCapitalUserId
  if (uid === null || uid === undefined || uid === '') return true
  const n = Number(uid)
  return !Number.isFinite(n) || n <= 0
}

function summaryTitle(row) {
  const nick = txt(row?.nickname)
  const mob = txt(row?.mobile)
  if (nick && nick !== '—' && mob && mob !== '—') return `${nick}(${mob})`
  if (nick && nick !== '—') return nick
  if (mob && mob !== '—') return mob
  return row?.id != null ? `申请 #${row.id}` : '申请人'
}

function applyNoText(row) {
  const no = row?.applyNo
  if (no != null && String(no).trim() !== '') return String(no).trim()
  return row?.id != null ? `（暂无单号）#${row.id}` : '—'
}

/** 与 PendingReviewList 的 reviewLabel 同理：副文一行展示关键字段 */
function replenishmentReviewLabel(row) {
  // const no = applyNoText(row)
  const amt = formatMoney(row.replenishAmount ?? 0)
  return `补仓额度：${amt}`
}

function displayBalance(row) {
  const b = row?.balanceAmount
  if (b === null || b === undefined || b === '') return '—'
  return formatMoney(b)
}

function hasAuditRemark(row) {
  const r = row?.auditRemark
  return r != null && String(r).trim() !== ''
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'AdminReplenishmentDetail', params: { id: String(id) } })
}

async function loadAwaitAssignList() {
  try {
    const pendingIds = new Set(list.value.map((r) => r?.id).filter((id) => id != null))
    const acc = []
    const seen = new Set()
    let p = 1
    while (p <= AWAIT_SCAN_MAX_PAGES) {
      const raw = await getAllAdminReplenishments({ page: p, size: AWAIT_SCAN_PAGE_SIZE })
      const { list: rows, hasMore } = parsePageResponse(raw, AWAIT_SCAN_PAGE_SIZE)
      for (const row of rows) {
        if (!isAwaitingCapitalAssign(row)) continue
        const id = row?.id
        if (id == null || seen.has(id) || pendingIds.has(id)) continue
        seen.add(id)
        acc.push(row)
      }
      if (!hasMore || !rows.length) break
      p += 1
    }
    awaitAssignList.value = acc
  } catch {
    awaitAssignList.value = []
  }
}

async function fetchPage(p) {
  const st = statusFilter.value
  let raw
  if (st === '1') {
    raw = await getAllAdminReplenishments({ page: p, size: pageSize.value, status: 1 })
  } else if (st === 'all') {
    raw = await getAllAdminReplenishments({ page: p, size: pageSize.value })
  } else {
    const n = Number(st)
    raw = await getAllAdminReplenishments({
      page: p,
      size: pageSize.value,
      status: Number.isFinite(n) ? n : undefined,
    })
  }
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = Array.isArray(parsed.list) ? parsed.list : []
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  const t = parsed.total != null ? Number(parsed.total) : 0
  recordsTotal.value = Number.isFinite(t) && t >= 0 ? t : 0
  if (st === '1') {
    await loadAwaitAssignList()
  } else {
    awaitAssignList.value = []
  }
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

async function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  try {
    await fetchPage(page.value)
  } catch {
    /* 拦截器 Toast */
  }
}

function openApprove(row) {
  currentRow.value = row
  approveTransferScreenshotUrl.value = ''
  approveRemark.value = ''
  approveShow.value = true
}

function openReject(row) {
  currentRow.value = row
  rejectRemark.value = ''
  rejectShow.value = true
}

async function openAssign(row) {
  currentRow.value = row
  resetAssignSelection()
  assignRemark.value = ''
  assignShow.value = true
  await loadExecutorPickerOptions()
  if (!pickerColumns.value.length) {
    showToast('暂无可选用户')
    assignShow.value = false
  }
}

function openAssignExecutorPicker() {
  if (!pickerColumns.value.length) {
    showToast('暂无可选用户')
    return
  }
  assignExecutorPickerOpen.value = true
}

function onAssignExecutorPickerConfirm({ selectedOptions }) {
  applyPickerConfirm(selectedOptions)
  assignExecutorPickerOpen.value = false
}

async function submitApprove() {
  const id = currentRow.value?.id
  if (id == null) return
  const url = String(approveTransferScreenshotUrl.value || '').trim()
  if (!url) {
    showToast('请上传打款凭证')
    return
  }
  rowActionId.value = id
  actionKind.value = 'approve'
  approveSubmitting.value = true
  try {
    const transferRemark = approveRemark.value.trim()
    await approveReplenishment(id, {
      transferScreenshotUrl: url,
      transferRemark: transferRemark || undefined,
    })
    showToast('已通过')
    approveShow.value = false
    await fetchPage(page.value)
  } finally {
    approveSubmitting.value = false
    rowActionId.value = null
    actionKind.value = ''
  }
}

async function submitReject() {
  const id = currentRow.value?.id
  if (id == null) return
  const remark = rejectRemark.value.trim()
  if (!remark) {
    showToast('请填写拒绝原因')
    return
  }
  rowActionId.value = id
  actionKind.value = 'reject'
  rejectSubmitting.value = true
  try {
    await rejectReplenishment(id, { remark })
    showToast('已拒绝')
    rejectShow.value = false
    await fetchPage(page.value)
  } finally {
    rejectSubmitting.value = false
    rowActionId.value = null
    actionKind.value = ''
  }
}

async function submitAssign() {
  const id = currentRow.value?.id
  if (id == null) return
  const n = assignSelectedUserId.value
  if (n == null || !Number.isFinite(n) || n <= 0) {
    showToast('请选择执行人')
    return
  }
  assignSubmitting.value = true
  try {
    await assignReplenishment(id, {
      capitalUserId: n,
      remark: assignRemark.value.trim() || undefined,
    })
    showToast('转派成功')
    assignShow.value = false
    await fetchPage(page.value)
  } finally {
    assignSubmitting.value = false
  }
}
</script>

<style scoped>
.admin-pending {
  min-width: 0;
  padding-bottom: 8px;
}
.admin-pending__filter {
  margin: 0 0 4px;
  background: #fff;
}
.admin-pending__filter :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
.admin-pending__wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.admin-pending__wrap--docked {
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.admin-pending__dock {
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
.admin-pending__sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
}
.admin-pending__sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.admin-pending__sum-row--sub {
  margin-top: 8px;
}
.admin-pending__sum-label {
  font-size: 14px;
  color: #646566;
}
.admin-pending__sum-value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.admin-pending__sum-value--warn {
  color: #ff976a;
}
.admin-pending__sum-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
.admin-pending__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.admin-pending__pager-text {
  font-size: 13px;
  color: #646566;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #646566;
  padding: 12px 16px 4px;
}
/** 与下级结算 pending-review 列表同款扁平 cell */
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
.assign-popup {
  padding: 12px 0 20px;
}
.assign-popup__loading {
  padding: 28px 16px;
  justify-content: center;
}
.assign-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 12px;
}
.assign-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
.action-popup {
  padding: 12px 0 20px;
}
.action-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.action-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
.action-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
</style>
