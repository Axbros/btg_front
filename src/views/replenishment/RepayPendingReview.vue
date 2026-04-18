<template>
  <div class="repay-pending-review">
    <AppHeader title="待审归仓申请" />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="list.length">
          <van-card
            v-for="(row, idx) in list"
            :key="rowKey(row, idx)"
            class="repay-pr-card"
            :title="applicantTitle(row)"
          >
            <template #tags>
              <van-tag :type="repayStatusTagType(row.status)" plain round>
                {{ formatRepayStatus(row.status) }}
              </van-tag>
            </template>
            <van-cell-group :border="false" class="repay-pr-card__cells">
              <van-cell title="关联补仓单号" :value="txt(row.replenishApplyNo)" />
              <van-cell title="归仓金额" :value="formatMoney(num(row.repayAmount))" />
              <van-cell title="资方收款 UID" :value="txt(row.capitalReceiverUid)" />
              <van-cell title="提交次数" :value="submitVersionText(row.submitVersion)" />
              <van-cell title="最新提交时间" :value="formatDateTime(latestSubmitTime(row))" />
              <van-cell v-if="hasReject(row)" title="拒绝原因" :label="txt(row.lastRejectReason)" />
            </van-cell-group>
            <template #footer>
              <div class="repay-pr-card__footer">
                <van-button size="small" plain type="primary" @click.stop="goDetail(row)">查看详情</van-button>
                <van-button size="small" plain type="primary" @click.stop="goFlow(row)">查看状态流</van-button>
                <template v-if="canReviewRow(row)">
                  <van-button size="small" type="success" plain @click.stop="openApprove(row)">通过</van-button>
                  <van-button size="small" type="danger" plain @click.stop="openReject(row)">拒绝</van-button>
                </template>
              </div>
            </template>
          </van-card>
        </template>
        <van-empty v-if="!loading && !list.length && loaded" description="暂无待审核归仓申请" />
      </van-list>
    </van-pull-refresh>

    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
    </div>

    <van-dialog
      v-model:show="approveShow"
      title="审核通过"
      :show-confirm-button="false"
      :show-cancel-button="false"
      close-on-click-overlay
    >
      <div class="dlg-body">
        <van-field
          v-model="approveRemark"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          maxlength="200"
          show-word-limit
          placeholder="可选，如：已确认到账"
        />
        <div class="dlg-actions">
          <van-button size="small" @click="approveShow = false">取消</van-button>
          <van-button size="small" type="primary" :loading="approveSubmitting" @click="confirmApprove">
            确认通过
          </van-button>
        </div>
      </div>
    </van-dialog>

    <van-dialog
      v-model:show="rejectShow"
      title="审核拒绝"
      :show-confirm-button="false"
      :show-cancel-button="false"
      close-on-click-overlay
    >
      <div class="dlg-body">
        <van-field
          v-model="rejectRemark"
          label="拒绝说明"
          type="textarea"
          rows="3"
          autosize
          required
          maxlength="500"
          show-word-limit
          placeholder="必填，如：金额不符，请重新提交"
        />
        <div class="dlg-actions">
          <van-button size="small" @click="rejectShow = false">取消</van-button>
          <van-button size="small" type="danger" :loading="rejectSubmitting" @click="confirmReject">
            确认拒绝
          </van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import {
  getPendingRepayReviewList,
  approveRepayApply,
  rejectRepayApply,
} from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatDateTime, formatMoney, formatRepayStatus, repayStatusTagType } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

const approveShow = ref(false)
const rejectShow = ref(false)
const approveRemark = ref('')
const rejectRemark = ref('')
const activeRow = ref(null)
const approveSubmitting = ref(false)
const rejectSubmitting = ref(false)

const myUserId = computed(() => {
  const u = userInfo.value
  if (!u) return null
  const n = Number(u.id)
  return Number.isFinite(n) ? n : null
})

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function rowKey(row, idx) {
  return String(row.id ?? `row-${idx}`)
}

function submitVersionText(v) {
  if (v == null || v === '') return '—'
  return String(v)
}

function applicantTitle(row) {
  const name = row?.applicantName
  if (name != null && String(name).trim() !== '') return `申请人：${String(name).trim()}`
  const uid = row?.userId
  if (uid != null && String(uid).trim() !== '') return `申请人 ID：${String(uid).trim()}`
  return '申请人'
}

function latestSubmitTime(row) {
  return row?.submitTime ?? row?.createdAt ?? row?.updatedAt ?? row?.latestOperateTime ?? null
}

function hasReject(row) {
  const r = row?.lastRejectReason
  return r != null && String(r).trim() !== ''
}

function canReviewRow(row) {
  const me = myUserId.value
  if (me == null) return false
  const cap = Number(row?.capitalUserId)
  if (!Number.isFinite(cap)) return false
  return cap === me
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

function goFlow(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayFlowDetail', params: { id: String(id) } })
}

function openApprove(row) {
  if (!canReviewRow(row)) return
  activeRow.value = row
  approveRemark.value = ''
  approveShow.value = true
}

function openReject(row) {
  if (!canReviewRow(row)) return
  activeRow.value = row
  rejectRemark.value = ''
  rejectShow.value = true
}

async function confirmApprove() {
  const row = activeRow.value
  const id = row?.id
  if (id == null) return
  approveSubmitting.value = true
  try {
    const remark = approveRemark.value.trim()
    await approveRepayApply(id, remark ? { remark } : {})
    showToast({ type: 'success', message: '已通过' })
    approveShow.value = false
    await reloadCurrentPage()
  } catch {
    /* request toast */
  } finally {
    approveSubmitting.value = false
  }
}

async function confirmReject() {
  const row = activeRow.value
  const id = row?.id
  if (id == null) return
  const remark = rejectRemark.value.trim()
  if (!remark) {
    showToast('请填写拒绝说明')
    return
  }
  rejectSubmitting.value = true
  try {
    await rejectRepayApply(id, { remark })
    showToast({ type: 'success', message: '已拒绝' })
    rejectShow.value = false
    await reloadCurrentPage()
  } catch {
    /* */
  } finally {
    rejectSubmitting.value = false
  }
}

async function fetchPage(p) {
  const raw = await getPendingRepayReviewList({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = rows
  hasMore.value = more
  finished.value = !more
  loaded.value = true
}

async function reloadCurrentPage() {
  try {
    await fetchPage(page.value)
  } catch {
    /* */
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
.repay-pending-review {
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
.repay-pr-card {
  margin: 12px 12px 0;
  background: #fff;
}
.repay-pr-card__cells {
  margin-top: 0;
}
.repay-pr-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.dlg-body {
  padding: 12px 16px 16px;
}
.dlg-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 20px;
}
.pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
