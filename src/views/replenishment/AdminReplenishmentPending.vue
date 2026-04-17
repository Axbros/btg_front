<template>
  <div class="admin-pending">
    <AppHeader title="待审核补仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="list.length">
          <van-cell-group v-for="(row, idx) in list" :key="row.id ?? idx" inset class="repl-block">
            <van-cell
              :title="summaryTitle(row)"
              :label="summaryLabel(row)"
              is-link
              center
              @click="goDetail(row)"
            >
              <template #value>
                <div class="repl-block__right">
                  <div class="repl-block__amt">{{ formatMoney(row.replenishAmount ?? row.replenish_amount ?? 0) }}</div>
                  <van-tag :type="replenishmentStatusTagType(listStatus(row))" plain round class="repl-block__tag">
                    {{ formatReplenishmentStatus(listStatus(row)) }}
                  </van-tag>
                </div>
              </template>
            </van-cell>
            <van-cell title="补仓单号" :value="applyNoText(row)" />
            <van-cell title="当前余额" :value="displayBalance(row)" />
            <van-cell title="补仓额度" :value="formatMoney(row.replenishAmount ?? row.replenish_amount ?? 0)" />
            <van-cell title="提交时间" :value="formatDateTime(row.submitTime ?? row.submit_time)" />
            <van-cell v-if="hasAuditRemark(row)" title="审核备注" :label="txt(row.auditRemark ?? row.audit_remark)" />
            <van-cell title="操作">
              <template #value>
                <div class="repl-block__actions">
                  <van-button
                    size="small"
                    type="primary"
                    plain
                    :loading="rowActionId === row.id && actionKind === 'approve'"
                    @click.stop="openApprove(row)"
                  >
                    通过
                  </van-button>
                  <van-button
                    size="small"
                    type="danger"
                    plain
                    :loading="rowActionId === row.id && actionKind === 'reject'"
                    @click.stop="openReject(row)"
                  >
                    拒绝
                  </van-button>
                  <van-button size="small" type="warning" plain @click.stop="openAssign(row)">转派</van-button>
                  <van-button size="small" plain type="primary" @click.stop="goDetail(row)">查看详情</van-button>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </template>
        <van-empty v-if="!loading && !list.length && loaded" description="暂无待审核补仓" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
    </div>

    <van-popup v-model:show="approveShow" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="action-popup">
        <div class="action-popup__title">审核通过</div>
        <van-cell-group inset>
          <van-field v-model="approveRemark" rows="2" autosize type="textarea" maxlength="500" placeholder="备注（可选）" show-word-limit />
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
        <div class="assign-popup__title">转派资方执行人</div>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import {
  getPendingReplenishments,
  approveReplenishment,
  rejectReplenishment,
  assignReplenishment,
} from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime, formatReplenishmentStatus, replenishmentStatusTagType } from '@/utils/format'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const rowActionId = ref(null)
const actionKind = ref('')

const approveShow = ref(false)
const rejectShow = ref(false)
const assignShow = ref(false)
const currentRow = ref(null)

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

/** 列表项无 status 时按待管理员审核展示 */
function listStatus(row) {
  const s = row?.status ?? row?.statusCode
  if (s == null || s === '') return 1
  return s
}

function summaryTitle(row) {
  const nick = txt(row?.nickname ?? row?.userNickname, '')
  const mob = txt(row?.mobile ?? row?.userMobile, '')
  if (nick && nick !== '—' && mob && mob !== '—') return `${nick} · ${mob}`
  if (nick && nick !== '—') return nick
  if (mob && mob !== '—') return mob
  return row?.id != null ? `申请 #${row.id}` : '申请人'
}

function summaryLabel(row) {
  return `点击整行进入详情 · 申请 ID ${row?.id ?? '—'}`
}

function applyNoText(row) {
  const no = row?.applyNo ?? row?.apply_no
  if (no != null && String(no).trim() !== '') return String(no).trim()
  return row?.id != null ? `（暂无单号）#${row.id}` : '—'
}

function displayBalance(row) {
  const b = row?.balanceAmount ?? row?.balance_amount
  if (b === null || b === undefined || b === '') return '—'
  return formatMoney(b)
}

function hasAuditRemark(row) {
  const r = row?.auditRemark ?? row?.audit_remark
  return r != null && String(r).trim() !== ''
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'AdminReplenishmentDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await getPendingReplenishments({ page: p, size: pageSize.value })
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

function changePage(delta) {
  const next = page.value + delta
  if (next < 1) return
  if (delta > 0 && !hasMore.value) return
  page.value = next
  fetchPage(page.value)
}

function openApprove(row) {
  currentRow.value = row
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
  rowActionId.value = id
  actionKind.value = 'approve'
  approveSubmitting.value = true
  try {
    await approveReplenishment(id, { remark: approveRemark.value.trim() || undefined })
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
  color: #323233;
}
.repl-block__tag {
  flex-shrink: 0;
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
</style>
