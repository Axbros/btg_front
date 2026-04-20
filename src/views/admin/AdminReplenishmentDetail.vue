<template>
  <div>
    <AppHeader title="补仓审核详情" />
    <van-loading v-if="loading" class="detail-loading" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <ReplenishmentApplyDetailBody :detail="detail" />
      <ReplenishmentSubmitMt5SnapshotGroup :snapshot="detail?.submitMt5Snapshot" />
      <van-cell-group v-if="showActionBar" inset class="detail-actions">
        <van-cell>
          <div class="card__actions">
            <van-button v-if="canAgree" size="small" type="primary" plain :loading="agreeSubmitting" @click="openAgree">
              同意
            </van-button>
            <van-button v-if="canAssign" size="small" type="warning" plain :loading="assignSubmitting" @click="openAssign">
              转派
            </van-button>
            <van-button v-if="canReject" size="small" type="danger" plain @click="openReject">拒绝</van-button>
          </div>
        </van-cell>
      </van-cell-group>
    </template>
    <EmptyState v-else description="未获取到补仓信息" />

    <van-popup v-model:show="agreePopupShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="action-popup">
        <div class="action-popup__title">同意补仓</div>
        <p class="action-popup__hint">请上传打款凭证并填写备注，确认后将提交同意。</p>
        <van-cell-group inset>
          <van-field label="打款凭证" readonly placeholder="请上传">
            <template #input>
              <ImageUploadField
                v-model="agreeForm.transferScreenshotUrl"
                upload-type="TRANSFER"
                hint="转账截图（必填）"
              />
            </template>
          </van-field>
          <van-field
            v-model="agreeForm.transferRemark"
            label="备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            show-word-limit
            placeholder="选填"
          />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="closeAgreePopup">取消</van-button>
          <van-button block round type="primary" :loading="agreeSubmitting" @click="submitAgree">确认同意</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="assignPopupShow" position="bottom" round :style="{ maxHeight: '85%' }">
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
          <van-field
            v-model="assignRemark"
            label="转派备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            placeholder="选填"
            show-word-limit
          />
        </van-cell-group>
        <div class="assign-popup__actions">
          <van-button block round @click="assignPopupShow = false">取消</van-button>
          <van-button block round type="primary" :loading="assignSubmitting" @click="submitAssign">确认转派</van-button>
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
import ReplenishmentSubmitMt5SnapshotGroup from '@/components/ReplenishmentSubmitMt5SnapshotGroup.vue'
import { fetchAdminReplenishmentDetail, approveReplenishmentAdmin, rejectReplenishmentAdmin } from '@/api/adminReplenishment'
import { assignReplenishment } from '@/api/replenishment'

const route = useRoute()

const loading = ref(true)
const detail = ref(null)

const agreePopupShow = ref(false)
const agreeSubmitting = ref(false)
const agreeForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
})

const assignPopupShow = ref(false)
const assignCapitalUserId = ref('')
const assignRemark = ref('')
const assignSubmitting = ref(false)

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
  if (raw.applyNo != null || raw.principalAmount != null || raw.id != null) return raw
  return null
}

const statusN = computed(() => {
  const n = Number(detail.value?.status)
  return Number.isFinite(n) ? n : NaN
})

function hasAssignedCapitalUser(row) {
  const uid = row?.assignedCapitalUserId
  if (uid === null || uid === undefined || uid === '') return false
  const n = Number(uid)
  return Number.isFinite(n) && n > 0
}

/** 1 待管理员审核：同意、拒绝 */
const canAgree = computed(() => statusN.value === 1)
/** 2 已通过待转派且尚未指定资方执行用户：转派 */
const canAssign = computed(() => statusN.value === 1 )
/** 待管理员审核或待转派阶段可拒绝 */
const canReject = computed(() => statusN.value === 1 )

const showActionBar = computed(() => canAgree.value || canAssign.value || canReject.value)

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

function resetAgreeForm() {
  agreeForm.transferScreenshotUrl = ''
  agreeForm.transferRemark = ''
}

function openAgree() {
  resetAgreeForm()
  agreePopupShow.value = true
}

function closeAgreePopup() {
  agreePopupShow.value = false
  resetAgreeForm()
}

async function submitAgree() {
  const id = applyId.value
  if (id == null) return
  const url = String(agreeForm.transferScreenshotUrl || '').trim()
  if (!url) {
    showToast('请上传打款凭证')
    return
  }
  const transferRemark = String(agreeForm.transferRemark || '').trim()
  agreeSubmitting.value = true
  try {
    await approveReplenishmentAdmin(id, {
      transferScreenshotUrl: url,
      transferRemark: transferRemark || undefined,
    })
    showToast({ type: 'success', message: '已同意' })
    closeAgreePopup()
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    agreeSubmitting.value = false
  }
}

function openAssign() {
  assignCapitalUserId.value = ''
  assignRemark.value = ''
  assignPopupShow.value = true
}

async function submitAssign() {
  const id = applyId.value
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
    showToast({ type: 'success', message: '转派成功' })
    assignPopupShow.value = false
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    assignSubmitting.value = false
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
.dialog-field-wrap {
  padding: 0 8px 8px;
}
.action-popup {
  padding: 16px 0 20px;
}
.action-popup__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding: 0 16px 8px;
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
</style>
