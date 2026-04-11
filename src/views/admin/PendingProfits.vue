<template>
  <div>
    <AppHeader title="待审核收益" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="(row, idx) in list" :key="idx" class="card">
          <van-cell-group inset>
            <van-cell title="申报单号" :value="pickNo(row)" />
            <van-cell title="玩家ID" :value="String(row.userId ?? '—')" />
            <van-cell title="推荐人ID" :value="String(row.referrerUserId ?? '—')" />
            <van-cell title="盈利金额" :value="formatMoney(row.profitAmount)" />
            <van-cell title="子级利润比例" :value="formatRate(row.commissionRate)" />
            <van-cell title="分润金额" :value="formatMoney(row.commissionAmount)" />
            <van-cell title="收益截图">
              <a v-if="img(row.profitScreenshotUrl ?? row.profitImg)" :href="img(row.profitScreenshotUrl ?? row.profitImg)" target="_blank" rel="noopener">查看</a>
              <span v-else>—</span>
            </van-cell>
            <van-cell title="转账截图">
              <a v-if="img(row.transferScreenshotUrl ?? row.transferImg)" :href="img(row.transferScreenshotUrl ?? row.transferImg)" target="_blank" rel="noopener">查看</a>
              <span v-else>—</span>
            </van-cell>
            <van-cell title="提交时间" :value="formatDateTime(row.submitTime)" />
            <van-cell>
              <div class="card__actions">
                <van-button size="small" type="primary" plain @click="openApproveDialog(row)">通过</van-button>
                <van-button size="small" type="danger" plain @click="openReject(row)">拒绝</van-button>
              </div>
            </van-cell>
          </van-cell-group>
        </div>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="changePage(-1)">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="changePage(1)">下一页</van-button>
    </div>

    <van-dialog
      v-model:show="approveDialogShow"
      title="确认通过该申报？"
      show-cancel-button
      :before-close="onApproveDialogBeforeClose"
    />

    <van-dialog
      v-model:show="rejectShow"
      title="填写拒绝备注"
      show-cancel-button
      confirm-button-text="确认拒绝"
      confirm-button-color="#ee0a24"
      :before-close="onRejectDialogBeforeClose"
    >
      <div class="dialog-field-wrap">
        <van-field
          v-model="rejectRemark"
          rows="3"
          autosize
          type="textarea"
          maxlength="200"
          placeholder="拒绝原因"
          show-word-limit
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchPendingProfits, approveProfit, rejectProfit } from '@/api/admin'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime, formatRate } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const approveDialogShow = ref(false)
const approveTarget = ref(null)
const rejectShow = ref(false)
const rejectRemark = ref('')
const rejectTarget = ref(null)

function pickNo(row) {
  return String(row.recordNo ?? row.id ?? '—')
}

/** ProfitRecord 主键，对应 ProfitAuditRequest.profitRecordId */
function pickId(row) {
  return row.id
}

function img(u) {
  return u ? String(u) : ''
}

async function fetchPage(p) {
  const params = { page: p, size: pageSize.value }
  const raw = await fetchPendingProfits(params)
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

function openApproveDialog(row) {
  const id = pickId(row)
  if (id == null) {
    showToast('无法识别单据ID')
    return
  }
  approveTarget.value = row
  approveDialogShow.value = true
}

async function onApproveDialogBeforeClose(action) {
  if (action === 'cancel') {
    approveTarget.value = null
    return true
  }
  const row = approveTarget.value
  const id = row ? pickId(row) : null
  if (id == null) {
    showToast('无法识别单据ID')
    return false
  }
  try {
    await approveProfit({ profitRecordId: id })
    showToast('已通过')
    approveTarget.value = null
    await fetchPage(page.value)
    return true
  } catch {
    return false
  }
}

function openReject(row) {
  rejectTarget.value = row
  rejectRemark.value = ''
  rejectShow.value = true
}

async function onRejectDialogBeforeClose(action) {
  if (action === 'cancel') {
    rejectTarget.value = null
    return true
  }
  const row = rejectTarget.value
  const id = row ? pickId(row) : null
  const remark = rejectRemark.value.trim()
  if (id == null) {
    showToast('无法识别单据ID')
    return false
  }
  if (!remark) {
    showToast('请填写拒绝备注')
    return false
  }
  try {
    await rejectProfit({ profitRecordId: id, remark })
    showToast('已拒绝')
    rejectTarget.value = null
    await fetchPage(page.value)
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.card {
  margin-bottom: 8px;
}
.card__actions {
  display: flex;
  gap: 10px;
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
.dialog-field-wrap {
  padding: 0 8px 8px;
}
</style>
