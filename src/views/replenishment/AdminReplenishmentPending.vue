<template>
  <div class="admin-pending">
    <AppHeader title="补仓审核" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="listSections.length">
          <template v-for="section in listSections" :key="section.key">
            <div v-if="section.title" class="section-title">{{ section.title }}</div>
            <van-cell-group
              v-for="(row, idx) in section.rows"
              :key="`${section.key}-${row.id ?? idx}`"
              inset
              class="repl-block"
            >
              <van-cell
                :title="summaryTitle(row)"
              
                is-link
                center
                @click="goDetail(row)"
              >
                <template #value>
                  <div class="repl-block__right">
                    <div class="repl-block__amt">{{ formatMoney(row.replenishAmount ?? 0) }}</div>
                   
                  </div>
                </template>
              </van-cell>
              <van-cell title="补仓单号" :value="applyNoText(row)" />
              <van-cell title="当前余额" :value="displayBalance(row)" />
              <van-cell title="补仓额度" :value="formatMoney(row.replenishAmount ?? 0)" />
              <van-cell title="提交时间" :value="formatDateTime(row.submitTime)" />
              <van-cell v-if="hasAuditRemark(row)" title="审核备注" :label="txt(row.auditRemark)" />
              <van-cell title="操作">
                <template #value>
                  <div class="repl-block__actions">
                    <van-button
                      v-if="isPendingAdminReview(row)"
                      size="small"
                      type="primary"
                      plain
                      :loading="rowActionId === row.id && actionKind === 'approve'"
                      @click.stop="openApprove(row)"
                    >
                      通过
                    </van-button>
                    <van-button
                      v-if="isPendingAdminReview(row)"
                      size="small"
                      type="danger"
                      plain
                      :loading="rowActionId === row.id && actionKind === 'reject'"
                      @click.stop="openReject(row)"
                    >
                      拒绝
                    </van-button>
                    <van-button
                      v-if="isAwaitingCapitalAssign(row)"
                      size="small"
                      type="warning"
                      plain
                      :loading="assignSubmitting && currentRow?.id === row.id"
                      @click.stop="openAssign(row)"
                    >
                      转派
                    </van-button>
                    <van-button size="small" plain type="primary" @click.stop="goDetail(row)">查看详情</van-button>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </template>
        </template>
        <van-empty v-if="!loading && !listSections.length && loaded" description="暂无待处理补仓" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
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
        <van-cell-group inset>
          <van-field
            v-model="assignCapitalUserId"
            label="执行人用户ID"
            type="digit"
            placeholder="填写 capitalUserId（btg_user.id）"
            required
          />
          <van-field v-model="assignRemark" label="转派备注" type="textarea" rows="2" autosize maxlength="500" placeholder="选填" show-word-limit />
        </van-cell-group>
        <div class="assign-popup__actions">
          <van-button block round @click="assignShow = false">取消</van-button>
          <van-button block round type="primary" :loading="assignSubmitting" @click="submitAssign">确认转派</van-button>
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
import ImageUploadField from '@/components/ImageUploadField.vue'
import {
  getPendingReplenishments,
  getAllAdminReplenishments,
  approveReplenishment,
  rejectReplenishment,
  assignReplenishment,
} from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime } from '@/utils/format'

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

const listSections = computed(() => {
  const out = []
  if (list.value.length) {
    out.push({ key: 'pending', title: '待管理员审核', rows: list.value })
  }
  if (awaitAssignList.value.length) {
    out.push({ key: 'awaitAssign', title: '待转派资方执行用户', rows: awaitAssignList.value })
  }
  return out
})

const rowActionId = ref(null)
const actionKind = ref('')

const approveShow = ref(false)
const rejectShow = ref(false)
const assignShow = ref(false)
const currentRow = ref(null)

const approveTransferScreenshotUrl = ref('')
const approveRemark = ref('')
const rejectRemark = ref('')
const assignCapitalUserId = ref('')
const assignRemark = ref('')
const assignSubmitting = ref(false)
const approveSubmitting = ref(false)
const rejectSubmitting = ref(false)

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
  const raw = await getPendingReplenishments({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = Array.isArray(rows) ? rows : []
  hasMore.value = more
  finished.value = !more
  loaded.value = true
  await loadAwaitAssignList()
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

function openAssign(row) {
  currentRow.value = row
  assignCapitalUserId.value = ''
  assignRemark.value = ''
  assignShow.value = true
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
  const uid = assignCapitalUserId.value.trim()
  if (!uid) {
    showToast('请填写执行人用户ID')
    return
  }
  const n = Number(uid)
  if (!Number.isFinite(n) || n <= 0) {
    showToast('用户ID无效')
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
  padding-bottom: 8px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #646566;
  padding: 12px 16px 4px;
}
.repl-block {
  margin-top: 12px;
}
.repl-block__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 88px;
}
.repl-block__amt {
  font-size: 16px;
  font-weight: 700;
  color: #ee0a24;
}
.repl-block__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
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
.assign-popup {
  padding: 12px 0 20px;
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
