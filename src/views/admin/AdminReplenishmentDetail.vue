<template>
  <div>
    <AppHeader title="补仓审核详情" />
    <van-loading v-if="loading" class="detail-loading" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <ReplenishmentApplyDetailBody :detail="detail" />
      <van-cell v-if="Number(detail.status) === 7" class="status-hint-cell">
        <template #title>
          <span class="status-hint">待资方上传打款凭证并填写备注，完成后进入终审确认。</span>
        </template>
      </van-cell>
      <van-cell v-if="Number(detail.status) === 8" class="status-hint-cell">
        <template #title>
          <span class="status-hint">
            待终审：可多次「更新凭证/备注」修改转账凭证或备注（不上传新图则保留原凭证），确认无误后再终审通过。
          </span>
        </template>
      </van-cell>
      <van-cell-group inset class="detail-actions">
        <van-cell>
          <div class="card__actions">
            <van-button
              v-if="canAccept"
              size="small"
              type="primary"
              plain
              :loading="accepting"
              @click="onAccept"
            >
              受理
            </van-button>
            <van-button
              v-if="canUploadCapitalVoucher"
              size="small"
              type="primary"
              plain
              @click="openCapitalVoucher"
            >
              {{ capitalVoucherButtonLabel }}
            </van-button>
            <van-button v-if="canFinalApprove" size="small" type="primary" plain @click="openApprove">
              终审确认
            </van-button>
            <van-button v-if="canReject" size="small" type="danger" plain @click="openReject">拒绝</van-button>
          </div>
        </van-cell>
      </van-cell-group>
    </template>
    <EmptyState v-else description="未获取到补仓信息" />

    <van-popup v-model:show="capitalVoucherPopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="approve-popup">
        <div class="approve-popup__title">{{ capitalVoucherPopupTitle }}</div>
        <van-cell-group inset>
          <van-field label="资方凭证" readonly :placeholder="capitalVoucherUrlPlaceholder">
            <template #input>
              <ImageUploadField
                v-model="capitalVoucherForm.transferScreenshotUrl"
                upload-type="TRANSFER"
                :hint="capitalVoucherUploadHint"
              />
            </template>
          </van-field>
          <van-field
            v-model="capitalVoucherForm.transferRemark"
            label="备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            show-word-limit
            placeholder="选填"
          />
        </van-cell-group>
        <div class="approve-popup__actions">
          <van-button block round @click="closeCapitalVoucherPopup">取消</van-button>
          <van-button
            block
            round
            type="primary"
            :loading="capitalVoucherSubmitting"
            @click="submitCapitalVoucher"
          >
            提交
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="approvePopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="approve-popup">
        <div class="approve-popup__title">资方终审确认</div>
        <p class="approve-popup__desc">
          请核对申请信息与已提交的打款凭证、备注一致后，确认通过以完成审核。
        </p>
        <div class="approve-popup__actions">
          <van-button block round @click="closeApprovePopup">取消</van-button>
          <van-button block round type="primary" :loading="approveSubmitting" @click="submitApprove">
            确认通过
          </van-button>
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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import ReplenishmentApplyDetailBody from '@/components/ReplenishmentApplyDetailBody.vue'
import {
  fetchAdminReplenishmentDetail,
  approveReplenishmentAdmin,
  rejectReplenishmentAdmin,
  acceptReplenishmentAdmin,
  submitCapitalVoucherForAdmin,
} from '@/api/adminReplenishment'

const route = useRoute()

const loading = ref(true)
const detail = ref(null)
const accepting = ref(false)

const capitalVoucherPopupShow = ref(false)
const capitalVoucherSubmitting = ref(false)
/** 打开弹窗时详情上的备注（trimmed），用于判断状态 8 是否仅改备注 */
const initialRemarkOnOpen = ref('')
const capitalVoucherForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
})

const approvePopupShow = ref(false)
const approveSubmitting = ref(false)

const rejectShow = ref(false)
const rejectRemark = ref('')

const applyId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

function normalizeDetailPayload(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.replenishment && typeof raw.replenishment === 'object') return raw.replenishment
  if (raw.applyNo != null || raw.apply_no != null || raw.id != null) return raw
  return null
}

const statusN = computed(() => {
  const n = Number(detail.value?.status)
  return Number.isFinite(n) ? n : NaN
})

const canAccept = computed(() => statusN.value === 1)
const canFinalApprove = computed(() => statusN.value === 8)
const canUploadCapitalVoucher = computed(() => statusN.value === 7 || statusN.value === 8)

const capitalVoucherButtonLabel = computed(() =>
  statusN.value === 8 ? '更新凭证/备注' : '上传资方凭证',
)

const capitalVoucherPopupTitle = computed(() =>
  statusN.value === 8 ? '更新资方凭证或备注' : '上传资方凭证',
)

const capitalVoucherUrlPlaceholder = computed(() =>
  statusN.value === 8 ? '选填，不上传则保留原凭证' : '请上传',
)

const capitalVoucherUploadHint = computed(() =>
  statusN.value === 8
    ? '不上传新图则保留库里已有凭证；上传新图将覆盖。'
    : '资方给申请人的打款凭证（必填）',
)
const canReject = computed(() => {
  const s = statusN.value
  return s === 1 || s === 7 || s === 8
})

async function loadDetail() {
  const id = applyId.value
  if (id == null) {
    loading.value = false
    detail.value = null
    return
  }
  loading.value = true
  detail.value = null
  try {
    const raw = await fetchAdminReplenishmentDetail(id)
    detail.value = normalizeDetailPayload(raw)
  } catch {
    detail.value = null
    showToast('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

watch(applyId, () => loadDetail(), { immediate: true })

async function onAccept() {
  const id = applyId.value
  if (id == null) return
  accepting.value = true
  try {
    await acceptReplenishmentAdmin(id)
    showToast({ type: 'success', message: '已受理' })
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    accepting.value = false
  }
}

function resetCapitalVoucherForm() {
  capitalVoucherForm.transferScreenshotUrl = ''
  capitalVoucherForm.transferRemark = ''
  initialRemarkOnOpen.value = ''
}

function openCapitalVoucher() {
  resetCapitalVoucherForm()
  const st = statusN.value
  const d = detail.value
  if (st === 8 && d) {
    const ex = String(d.transferRemark ?? d.transfer_remark ?? '').trim()
    capitalVoucherForm.transferRemark = ex
    initialRemarkOnOpen.value = ex
  }
  capitalVoucherPopupShow.value = true
}

function closeCapitalVoucherPopup() {
  capitalVoucherPopupShow.value = false
  resetCapitalVoucherForm()
}

async function submitCapitalVoucher() {
  const id = applyId.value
  if (id == null) return
  const st = Number(detail.value?.status)
  const url = capitalVoucherForm.transferScreenshotUrl?.trim()
  const remarkNow = capitalVoucherForm.transferRemark?.trim() ?? ''

  if (st === 7) {
    if (!url) {
      showToast('请上传资方凭证')
      return
    }
    capitalVoucherSubmitting.value = true
    try {
      await submitCapitalVoucherForAdmin(id, {
        transferScreenshotUrl: url,
        transferRemark: remarkNow || undefined,
      })
      showToast({ type: 'success', message: '已提交，待终审确认' })
      closeCapitalVoucherPopup()
      await loadDetail()
    } catch {
      /* 请求层 */
    } finally {
      capitalVoucherSubmitting.value = false
    }
    return
  }

  if (st === 8) {
    const body = {}
    if (url) {
      body.transferScreenshotUrl = url
    }
    if (remarkNow !== initialRemarkOnOpen.value) {
      body.transferRemark = remarkNow
    }
    if (Object.keys(body).length === 0) {
      showToast('请上传新凭证或修改备注')
      return
    }
    capitalVoucherSubmitting.value = true
    try {
      await submitCapitalVoucherForAdmin(id, body)
      showToast({ type: 'success', message: '已保存' })
      closeCapitalVoucherPopup()
      await loadDetail()
    } catch {
      /* 请求层；异常无凭证时后端 400 */
    } finally {
      capitalVoucherSubmitting.value = false
    }
  }
}

function openApprove() {
  approvePopupShow.value = true
}

function closeApprovePopup() {
  approvePopupShow.value = false
}

async function submitApprove() {
  const id = applyId.value
  if (id == null) return
  approveSubmitting.value = true
  try {
    await approveReplenishmentAdmin(id)
    showToast({ type: 'success', message: '审核通过' })
    closeApprovePopup()
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    approveSubmitting.value = false
  }
}

function openReject() {
  rejectRemark.value = ''
  rejectShow.value = true
}

async function onRejectBeforeClose(action) {
  if (action === 'cancel') return true
  const id = applyId.value
  const remark = rejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝备注')
    return false
  }
  try {
    await rejectReplenishmentAdmin(id, remark)
    showToast('已拒绝')
    await loadDetail()
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.detail-loading {
  padding: 48px 0;
}
.detail-actions {
  margin-top: 8px;
}
.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.status-hint-cell :deep(.van-cell__title) {
  flex: 1;
}
.status-hint {
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
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
.approve-popup__desc {
  margin: 0 16px 4px;
  font-size: 14px;
  color: #646566;
  line-height: 1.55;
  text-align: center;
}
.approve-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
</style>
