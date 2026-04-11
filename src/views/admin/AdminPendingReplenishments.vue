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
            <van-cell v-if="img(row.transferScreenshotUrl ?? row.transfer_screenshot_url)" title="资方转账凭证">
              <a :href="img(row.transferScreenshotUrl ?? row.transfer_screenshot_url)" target="_blank" rel="noopener">查看</a>
            </van-cell>
            <van-cell
              v-if="txt(row.transferRemark ?? row.transfer_remark) !== '—'"
              title="资方转账备注"
              :value="txt(row.transferRemark ?? row.transfer_remark)"
            />
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

    <van-popup v-model:show="approvePopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="approve-popup">
        <div class="approve-popup__title">审核通过（需上传资方转账凭证）</div>
        <van-cell-group inset>
          <van-field
            v-model="approveForm.transferScreenshotUrl"
            name="transferScreenshotUrl"
            label="转账凭证"
            readonly
            placeholder="请上传凭证"
            :rules="[{ required: true, message: '请上传资方转账凭证' }]"
          >
            <template #input>
              <ImageUploadField
                v-model="approveForm.transferScreenshotUrl"
                upload-type="TRANSFER"
                hint="资方给申请人的打款凭证"
              />
            </template>
          </van-field>
          <van-field
            v-model="approveForm.transferRemark"
            label="转账备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            show-word-limit
            placeholder="选填"
          />
        </van-cell-group>
        <div class="approve-popup__actions">
          <van-button block round @click="closeApprovePopup">取消</van-button>
          <van-button block round type="primary" :loading="approveSubmitting" @click="submitApprove">确认通过</van-button>
        </div>
      </div>
    </van-popup>

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
import { reactive, ref } from 'vue'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
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

const approvePopupShow = ref(false)
const approveTarget = ref(null)
const approveSubmitting = ref(false)
const approveForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
})

const rejectShow = ref(false)
const rejectTarget = ref(null)
const rejectRemark = ref('')

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function img(u) {
  return u ? String(u) : ''
}

function resetApproveForm() {
  approveForm.transferScreenshotUrl = ''
  approveForm.transferRemark = ''
}

function openApprove(row) {
  approveTarget.value = row
  resetApproveForm()
  approvePopupShow.value = true
}

function closeApprovePopup() {
  approvePopupShow.value = false
  approveTarget.value = null
  resetApproveForm()
}

async function submitApprove() {
  const url = approveForm.transferScreenshotUrl?.trim()
  if (!url) {
    showToast('请上传资方转账凭证')
    return
  }
  const id = approveTarget.value?.id
  if (id == null) return
  approveSubmitting.value = true
  try {
    await approveReplenishmentAdmin(id, {
      transferScreenshotUrl: url,
      transferRemark: approveForm.transferRemark?.trim() || undefined,
    })
    showToast({ type: 'success', message: '审核通过' })
    closeApprovePopup()
    await fetchPage(page.value)
  } catch {
    /* Toast 由请求层 */
  } finally {
    approveSubmitting.value = false
  }
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
.approve-popup {
  padding: 16px 0 20px;
}
.approve-popup__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding: 0 16px 12px;
}
.approve-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
</style>
