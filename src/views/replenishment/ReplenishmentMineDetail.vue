<template>
  <div>
    <AppHeader title="补仓详情" />
    <van-loading v-if="loading" class="repl-mine-detail__loading" vertical>加载中…</van-loading>
    <template v-else>
      <ReplenishmentApplyDetailBody v-if="replenishment" :detail="replenishment" />
      <!-- <van-cell-group v-if="replenishment" inset title="归仓进度" class="repl-mine-detail__repay-progress">
        <van-cell title="完成归仓金额" :value="moneyTxt(replenishment.repaidAmount)" />
        <van-cell title="待审归仓金额" :value="moneyTxt(replenishment.pendingRepayAmount)" />
        <van-cell title="剩余待归还金额" :value="moneyTxt(replenishment.remainingAmount)" />
        <template v-if="latestRepayRow">
          <van-divider dashed />
          <van-cell title="最近归仓状态">
            <template #value>
              <van-tag :type="repayStatusTagType(latestRepayRow.status)" plain round>
                {{ formatRepayStatus(latestRepayRow.status) }}
              </van-tag>
            </template>
          </van-cell>
          <van-cell title="最近归仓单号" :value="txt(latestRepayRow.repayNo ?? latestRepayRow.id)" />
          <van-cell title="当前处理人" :value="txt(latestRepayRow.currentHandlerUserName)" />
        </template>
        <van-cell title="">
          <template #title>
            <div class="repl-mine-detail__btn-row repl-mine-detail__btn-row--inline">
              <van-button size="small" type="primary" plain round @click="goMyRepayList">查看归仓申请</van-button>
              <van-button
                v-if="latestRepayFlowId != null"
                size="small"
                type="default"
                plain
                round
                @click="goLatestRepayFlow"
              >
                查看归仓状态流
              </van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group> -->
      <van-cell-group v-if="replenishment" inset title="资方与到账确认" class="repl-mine-detail__capital">
        <van-cell title="资方执行用户" :value="capitalExecutorText" />
        <!-- <van-cell title="资方收款 UID" :value="txt(replenishment.capitalReceiverUid)" /> -->
        <van-cell v-if="transferShotUrl" title="资方转账凭证">
          <template #value>
            <PreviewableRemoteImage :url="transferShotUrl" alt="资方转账凭证" size="large" />
          </template>
        </van-cell>
          <van-cell
      title="资方转账备注"
      :value="txt(replenishment.transferRemark)"
    />
        
        <van-cell title="到账确认时间" :value="formatDateTime(replenishment.arrivalConfirmTime)" />
        <van-cell title="到账确认备注" :value="txt(replenishment.arrivalConfirmRemark)" />
        
        <van-cell title="到账确认状态">
          <template #value>
            <van-tag
              v-if="replenishment.arrivalConfirmStatus != null && String(replenishment.arrivalConfirmStatus) !== ''"
              :type="arrivalConfirmStatusTagType(replenishment.arrivalConfirmStatus)"
              plain
              round
            >
              {{ formatArrivalConfirmStatus(replenishment.arrivalConfirmStatus) }}
            </van-tag>
            <span v-else>—</span>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="showApplicantFundProgressHint" inset class="repl-mine-detail__fund">
        <van-cell title="交易所名称" :value="walletNameText" />
        <van-cell title="钱包地址" :value="walletAddressText" />
        <van-cell title="">
          <template #title>
            <p class="repl-mine-detail__fund-tip">{{ applicantFundProgressTip }}</p>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="showApplicantArrivalActions" inset class="repl-mine-detail__actions">
        <van-cell title="到账确认">
          <template #label>
            <div class="repl-mine-detail__btn-row repl-mine-detail__btn-row--inline">
              <van-button type="primary" size="small" round plain :loading="arrivalSubmitting" @click="openArrivalPopup('confirm')">
                确认到账
              </van-button>
              <van-button type="danger" size="small" round plain :loading="arrivalSubmitting" @click="openArrivalPopup('reject')">
                拒绝到账
              </van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="showCapitalExecutorActions" inset class="repl-mine-detail__actions">
        <van-cell title="资方处理">
          <template #label>
            <div class="repl-mine-detail__btn-row repl-mine-detail__btn-row--inline">
              <van-button type="primary" size="small" round plain :loading="capitalAgreeSubmitting" @click="openCapitalAgree">
                同意
              </van-button>
              <van-button type="danger" size="small" round plain @click="openCapitalReject">拒绝</van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="showReturnedActions" inset class="repl-mine-detail__actions">
        <van-cell title="已退回待修改">
          <template #label>
            <div class="repl-mine-detail__btn-row">
              <van-button type="primary" size="small" block round @click="goResubmit">去修改并重提</van-button>
              <van-button type="default" size="small" block round plain @click="goFlow">查看状态流</van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group v-if="approvedRepays.length"  title="已通过归仓" class="repl-mine-detail__repays">
        <van-cell
          v-for="(row, idx) in approvedRepays"
          :key="row.id ?? idx"
          is-link
          @click="goRepayDetail(row)"
        >
          <template #title>
            <div class="repl-mine-detail__repay-title">
              <span>{{ txt(row.repayNo) }}</span>
              <span class="repl-mine-detail__repay-meta">
                {{ formatDateTime(row.submitTime) }}
               
              </span>
            </div>
          </template>
          <template #value>
            <span class="repl-mine-detail__repay-amt">{{ formatMoney(row.repayAmount) }}</span>
          </template>
        </van-cell>
      </van-cell-group>
      <EmptyState v-if="!replenishment && !approvedRepays.length" description="未获取到补仓信息" />

    <van-popup v-model:show="capitalAgreeShow" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="capital-popup">
        <div class="capital-popup__title">同意补仓</div>
        <p class="capital-popup__hint">请上传转账凭证并填写备注，确认后将提交同意。</p>
        <van-cell-group inset>
          <van-field label="转账凭证" readonly>
            <template #input>
              <ImageUploadField v-model="capitalAgreeForm.transferScreenshotUrl" upload-type="TRANSFER" hint="上传截图（必填）" />
            </template>
          </van-field>
          <van-field
            v-model="capitalAgreeForm.transferRemark"
            label="备注"
            type="textarea"
            rows="2"
            autosize
            maxlength="500"
            placeholder="选填"
            show-word-limit
          />
          <van-field
            v-model="capitalAgreeForm.capitalReceiverUid"
            label="收款 UID"
            maxlength="100"
            placeholder="资方收款 UID（必填）"
          />
        </van-cell-group>
        <div class="capital-popup__actions">
          <van-button block round @click="capitalAgreeShow = false">取消</van-button>
          <van-button block round type="primary" :loading="capitalAgreeSubmitting" @click="submitCapitalAgree">确认同意</van-button>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="capitalRejectShow"
      title="拒绝补仓"
      show-cancel-button
      confirm-button-text="确认拒绝"
      confirm-button-color="#ee0a24"
      :before-close="onCapitalRejectBeforeClose"
    >
      <div class="dialog-field-wrap">
        <van-field
          v-model="capitalRejectRemark"
          rows="3"
          autosize
          type="textarea"
          maxlength="200"
          placeholder="拒绝原因（必填）"
          show-word-limit
          :border="false"
        />
      </div>
    </van-dialog>

    <van-popup v-model:show="arrivalPopupShow" position="bottom" round teleport="body" :style="{ width: '100%' }">
      <div class="repl-mine-popup">
        <div class="repl-mine-popup__title">{{ arrivalPopupTitle }}</div>
        <van-field
          v-model="arrivalRemark"
          type="textarea"
          rows="3"
          autosize
          maxlength="500"
          :placeholder="arrivalRemarkPlaceholder"
          show-word-limit
        />
        <div class="repl-mine-popup__actions">
          <van-button block round @click="closeArrivalPopup">取消</van-button>
          <van-button block round type="primary" :loading="arrivalSubmitting" @click="submitArrivalPopup">提交</van-button>
        </div>
      </div>
    </van-popup>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import ReplenishmentApplyDetailBody from '@/components/ReplenishmentApplyDetailBody.vue'
import { useAuthStore } from '@/stores/auth'
import {
  fetchReplenishmentMineDetail,
  capitalSubmitReplenishment,
  capitalRejectReplenishment,
  confirmArrival,
  rejectArrival,
} from '@/api/replenishment'
import {
  formatArrivalConfirmStatus,
  arrivalConfirmStatusTagType,
  formatMoney,
  formatDateTime,
  formatRepayStatus,
  repayStatusTagType,
} from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const replenishment = ref(null)
const approvedRepays = ref([])
const pendingRepays = ref([])

const applyId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

/** status 7 / 8：突出打款信息并说明资方侧进度 */
const showApplicantFundProgressHint = computed(() => {
  const r = replenishment.value
  if (!r) return false
  const s = Number(r.status)
  return s === 7 || s === 8
})

const showReturnedActions = computed(() => {
  const r = replenishment.value
  if (!r) return false
  return Number(r.status) === 9
})

const myUserId = computed(() => {
  const id = auth.userInfo?.id
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function isReplenishmentCapitalExecutor(r) {
  if (!r || myUserId.value == null) return false
  const me = myUserId.value
  const cap = Number(r.assignedCapitalUserId)
  const handler = Number(r.currentHandlerUserId)
  if (Number.isFinite(cap) && cap === me) return true
  if (Number.isFinite(handler) && handler === me) return true
  return false
}

function isPendingApplicantConfirmStatus(r) {
  if (!r) return false
  const s = r.status
  if (typeof s === 'string' && s.trim().toUpperCase().replace(/-/g, '_') === 'PENDING_APPLICANT_CONFIRM') return true
  return Number(s) === 4
}

/** 4 待确认到账：申请人为本人在「我的补仓」详情中可操作 */
const showApplicantArrivalActions = computed(() => {
  const r = replenishment.value
  if (!r || myUserId.value == null) return false
  if (!isPendingApplicantConfirmStatus(r)) return false
  if (Number(r.userId) !== myUserId.value) return false
  const ac = r.arrivalConfirmStatus
  if (ac == null || ac === '') return true
  const n = Number(ac)
  if (!Number.isFinite(n)) return true
  return n === 1
})

/** 3 待资方提交：当前用户为资方执行用户时，仅同意 / 拒绝 */
const showCapitalExecutorActions = computed(() => {
  const r = replenishment.value
  if (!r) return false
  if (Number(r.status) !== 3) return false
  return isReplenishmentCapitalExecutor(r)
})

const capitalAgreeShow = ref(false)
const capitalAgreeSubmitting = ref(false)
const capitalAgreeForm = reactive({
  transferScreenshotUrl: '',
  transferRemark: '',
  capitalReceiverUid: '',
})

const capitalRejectShow = ref(false)
const capitalRejectRemark = ref('')

const arrivalPopupShow = ref(false)
const arrivalPopupTitle = ref('确认到账')
const arrivalRemark = ref('')
const arrivalRemarkPlaceholder = ref('选填备注，如：已到账')
const arrivalSubmitting = ref(false)
const arrivalMode = ref('confirm')

const applicantFundProgressTip = computed(() => {
  const r = replenishment.value
  if (!r) return ''
  if (Number(r.status) === 7) {
    return '当前为「待资方补充资料」阶段，资方将上传打款凭证并填写备注；您无需在此提交。请核对打款信息，并留意状态更新。'
  }
  if (Number(r.status) === 8) {
    return '当前补仓已经完成，订单关闭。'
  }
  return ''
})

function pickWallet(r, key) {
  if (!r || typeof r !== 'object') return ''
  const v = r[key]
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

const walletNameText = computed(() => {
  const t = pickWallet(replenishment.value, 'walletName')
  return t || '—'
})

const walletAddressText = computed(() => {
  const t = pickWallet(replenishment.value, 'walletAddress')
  return t || '—'
})

const capitalExecutorText = computed(() => {
  const r = replenishment.value
  
  return r.assignedCapitalNickname
})

const transferShotUrl = computed(() => {
  const u = replenishment.value?.transferScreenshotUrl
  return u != null && String(u).trim() !== '' ? String(u).trim() : ''
})

const latestRepayRow = computed(() => {
  const rows = [...pendingRepays.value, ...approvedRepays.value].filter((x) => x && typeof x === 'object')
  if (!rows.length) return null
  return rows.reduce((best, cur) => {
    const tb = new Date(best?.submitTime || 0).getTime()
    const tc = new Date(cur?.submitTime || 0).getTime()
    return tc >= tb ? cur : best
  })
})

const latestRepayFlowId = computed(() => {
  const row = latestRepayRow.value
  if (row?.id != null) return row.id
  const r = replenishment.value
  const lid = r?.latestRepayId ?? r?.lastRepayApplyId
  return lid != null ? lid : null
})

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return formatMoney(v)
}

function goMyRepayList() {
  router.push({ name: 'RepayMine' })
}

function goLatestRepayFlow() {
  const id = latestRepayFlowId.value
  if (id == null) return
  router.push({ name: 'RepayFlowDetail', params: { id: String(id) } })
}

/**
 * GET /replenishments/{id} 返回 { replenishment, approvedRepays }；或扁平补仓 VO。
 */
function parseReplenishmentDetailPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { replenishment: null, approvedRepays: [], pendingRepays: [] }
  }
  const pendingList = Array.isArray(raw.pendingRepays)
    ? raw.pendingRepays
    : Array.isArray(raw.pendingRepayApplies)
      ? raw.pendingRepayApplies
      : []
  if ('replenishment' in raw || 'replenishmentApply' in raw || 'approvedRepays' in raw) {
    const repl = raw.replenishment ?? raw.replenishmentApply ?? null
    const list = raw.approvedRepays
    return {
      replenishment: repl && typeof repl === 'object' ? repl : null,
      approvedRepays: Array.isArray(list) ? list : [],
      pendingRepays: pendingList,
    }
  }
  if (raw.applyNo != null || raw.principalAmount != null) {
    return { replenishment: raw, approvedRepays: [], pendingRepays: pendingList }
  }
  return { replenishment: null, approvedRepays: [], pendingRepays: [] }
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function goRepayDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

function goResubmit() {
  const id = applyId.value
  if (id == null) return
  router.push({ name: 'ReplenishmentResubmit', params: { id: String(id) } })
}

function goFlow() {
  const id = applyId.value
  if (id == null) return
  router.push({ name: 'ReplenishmentFlow', params: { id: String(id) } })
}

async function loadDetail() {
  const id = applyId.value
  if (id == null) {
    loading.value = false
    replenishment.value = null
    approvedRepays.value = []
    pendingRepays.value = []
    return
  }
  loading.value = true
  replenishment.value = null
  approvedRepays.value = []
  pendingRepays.value = []
  try {
    const raw = await fetchReplenishmentMineDetail(id)
    const { replenishment: repl, approvedRepays: repays, pendingRepays: pend } =
      parseReplenishmentDetailPayload(raw)
    replenishment.value = repl
    approvedRepays.value = repays
    pendingRepays.value = pend
  } catch {
    replenishment.value = null
    approvedRepays.value = []
    pendingRepays.value = []
    showToast('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

watch(applyId, () => loadDetail(), { immediate: true })

function resetCapitalAgreeForm() {
  capitalAgreeForm.transferScreenshotUrl = ''
  capitalAgreeForm.transferRemark = ''
  capitalAgreeForm.capitalReceiverUid = ''
}

function openCapitalAgree() {
  resetCapitalAgreeForm()
  const r = replenishment.value
  const preset = r?.capitalReceiverUid
  if (preset) capitalAgreeForm.capitalReceiverUid = String(preset)
  capitalAgreeShow.value = true
}

async function submitCapitalAgree() {
  const id = applyId.value
  if (id == null) return
  const url = String(capitalAgreeForm.transferScreenshotUrl || '').trim()
  const uid = String(capitalAgreeForm.capitalReceiverUid || '').trim()
  if (!url) {
    showToast('请上传转账凭证')
    return
  }
  if (!uid) {
    showToast('请填写收款 UID')
    return
  }
  capitalAgreeSubmitting.value = true
  try {
    await capitalSubmitReplenishment(id, {
      transferScreenshotUrl: url,
      transferRemark: String(capitalAgreeForm.transferRemark || '').trim() || undefined,
      capitalReceiverUid: uid,
    })
    showToast({ type: 'success', message: '已提交同意' })
    capitalAgreeShow.value = false
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    capitalAgreeSubmitting.value = false
  }
}

function openCapitalReject() {
  capitalRejectRemark.value = ''
  capitalRejectShow.value = true
}

async function onCapitalRejectBeforeClose(action) {
  if (action === 'cancel') return true
  const id = applyId.value
  const remark = capitalRejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝原因')
    return false
  }
  try {
    await capitalRejectReplenishment(id, { remark })
    showToast('已拒绝')
    await loadDetail()
    return true
  } catch {
    return false
  }
}

function openArrivalPopup(mode) {
  arrivalMode.value = mode
  arrivalRemark.value = ''
  if (mode === 'reject') {
    arrivalPopupTitle.value = '拒绝到账'
    arrivalRemarkPlaceholder.value = '请填写原因（必填），如：未到账，请重新提交凭证'
  } else {
    arrivalPopupTitle.value = '确认到账'
    arrivalRemarkPlaceholder.value = '选填备注，如：已到账'
  }
  arrivalPopupShow.value = true
}

function closeArrivalPopup() {
  arrivalPopupShow.value = false
  arrivalSubmitting.value = false
}

async function submitArrivalPopup() {
  const id = applyId.value
  if (id == null) {
    showToast('无效单号')
    return
  }
  const remark = String(arrivalRemark.value ?? '').trim()
  if (arrivalMode.value === 'reject' && remark === '') {
    showToast('请填写拒绝原因')
    return
  }
  arrivalSubmitting.value = true
  try {
    if (arrivalMode.value === 'reject') {
      await rejectArrival(id, { remark })
      showToast('已提交拒绝到账')
    } else {
      await confirmArrival(id, remark ? { remark } : {})
      showToast('已确认到账')
    }
    closeArrivalPopup()
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    arrivalSubmitting.value = false
  }
}
</script>

<style scoped>
.repl-mine-detail__loading {
  padding: 48px 0;
}
.repl-mine-detail__repays {
  margin-top: 12px;
}
.repl-mine-detail__repay-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.repl-mine-detail__repay-meta {
  font-size: 12px;
  color: #969799;
  font-weight: 400;
}
.repl-mine-detail__repay-amt {
  font-size: 15px;
  color: #323233;
}
.repl-mine-detail__capital {
  margin-top: 12px;
}
.repl-mine-detail__fund {
  margin-top: 12px;
}
.repl-mine-detail__fund-tip {
  margin: 0;
  font-size: 13px;
  color: #646566;
  line-height: 1.55;
}
.repl-mine-detail__actions {
  margin-top: 12px;
}
.repl-mine-detail__btn-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.repl-mine-detail__btn-row--inline {
  flex-direction: row;
  flex-wrap: wrap;
}
.capital-popup {
  padding: 12px 0 20px;
}
.capital-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.capital-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
.capital-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
.repl-mine-detail__repay-progress {
  margin-top: 12px;
}
.repl-mine-popup {
  padding: 16px 16px calc(12px + env(safe-area-inset-bottom, 0px));
}
.repl-mine-popup__title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #323233;
}
.repl-mine-popup__actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
