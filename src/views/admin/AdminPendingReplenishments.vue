<template>
  <div>
    <AppHeader title="待审核补仓" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="(row, idx) in list" :key="row.id ?? idx" class="card">
          <van-cell-group inset>
            <van-cell title="申请单号" :value="txt(row.applyNo ?? row.apply_no)" />
            <van-cell title="用户ID" :value="String(row.userId ?? row.user_id ?? '—')" />
            <van-cell title="底仓本金" :value="formatMoney(row.principalAmount ?? row.principal_amount)" />
            <van-cell title="申报余额" :value="formatMoney(row.balanceAmount ?? row.balance_amount)" />
            <van-cell title="补仓额度" :value="formatMoney(row.replenishAmount ?? row.replenish_amount)" />
            <van-cell title="余额截图">
              <a v-if="img(row.balanceScreenshotUrl ?? row.balance_screenshot_url)" :href="img(row.balanceScreenshotUrl ?? row.balance_screenshot_url)" target="_blank" rel="noopener">查看</a>
              <span v-else>—</span>
            </van-cell>
            <van-cell title="提交时间" :value="formatDateTime(row.submitTime ?? row.submit_time)" />
            <van-cell>
              <div class="card__actions">
                <van-button size="small" type="primary" plain @click="openApprove(row)">通过</van-button>
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
      v-model:show="approveShow"
      title="确认通过该补仓申请？"
      show-cancel-button
      :before-close="onApproveBeforeClose"
    />

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝（请填写备注）"
      show-cancel-button
      confirm-button-text="确认拒绝"
      confirm-button-color="#ee0a24"
      :before-close="onRejectBeforeClose"
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
import {
  fetchAdminPendingReplenishments,
  approveReplenishmentAdmin,
  rejectReplenishmentAdmin,
} from '@/api/adminReplenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const approveShow = ref(false)
const approveTarget = ref(null)
const rejectShow = ref(false)
const rejectTarget = ref(null)
const rejectRemark = ref('')

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function img(u) {
  return u ? String(u) : ''
}

async function fetchPage(p) {
  const raw = await fetchAdminPendingReplenishments({ page: p, size: pageSize.value })
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
  approveTarget.value = row
  approveShow.value = true
}

async function onApproveBeforeClose(action) {
  if (action === 'cancel') {
    approveTarget.value = null
    return true
  }
  const id = approveTarget.value?.id
  if (id == null) return false
  try {
    await approveReplenishmentAdmin(id, null)
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

async function onRejectBeforeClose(action) {
  if (action === 'cancel') {
    rejectTarget.value = null
    return true
  }
  const id = rejectTarget.value?.id
  const remark = rejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝备注')
    return false
  }
  try {
    await rejectReplenishmentAdmin(id, remark)
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
