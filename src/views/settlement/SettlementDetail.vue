<template>
  <div :class="{ 'settlement-detail--pad-bottom': needSubmitTransferProof }">
    <AppHeader title="结算详情" />
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <van-cell-group inset title="上报发起人信息" class="settlement-report-section">
        <van-cell title="订单单号" :value="txt(reportNoText)" />
        <van-cell title="上报人姓名" :value="txt(settlementReportUserNicknameDisplay)" />
        <van-cell title="上报人手机" :value="txt(settlementReportUserMobileDisplay)" />
        <van-cell title="上报利润">
          <template #value>
            <span class="pay-amt">{{ settlementReportProfitAmountDisplay }}</span>
          </template>
        </van-cell>
        <van-cell title="上报人分润比例" :value="settlementParentToChildRatioDisplay" />
      </van-cell-group>

      <van-cell-group inset title="结算信息">
        <van-cell title="审核状态">
          <template #value>
            <van-tag :type="settlementTagType" plain round>
              {{ formatSettlementStatus(detail.status) }}
            </van-tag>
          </template>
        </van-cell>

        <van-cell title="付款人姓名" :value="txt(fromProfile.nickname)" />
        <van-cell title="付款人手机" :value="txt(fromProfile.mobile)" />
        <van-cell title="收款人姓名" :value="txt(toProfile.nickname)" />
        <van-cell title="收款人交易所UID">
          <template #value>
            <span class="pay-amt">{{ txt(toExchangeUidText) }}</span>
          </template>
        </van-cell>
        <!-- <van-cell title="收款人手机" :value="txt(toProfile.mobile)" /> -->
        <van-cell title="应付收款人金额">
          <template #value>
            <span class="pay-amt">{{ formatMoney(detail.payAmount) }}</span>
          </template>
        </van-cell>
        <van-cell v-if="needSubmitTransferProof" title="" class="hint-cell">
          <template #title>
            <span class="transfer-hint">请重新上传给上级的划转凭证；确认已向收款人完成打款后再提交上级审核。</span>
          </template>
        </van-cell>
         <van-cell title="利润截图">
          <template #value>
            <PreviewableRemoteImage
              v-if="img(profitShotUrl)"
              :url="profitShotUrl"
              alt="利润截图"
              size="large"
            />
            <span v-else>—</span>
          </template>
        </van-cell>
        <van-cell title="划转凭证">
          <template #value>
            <PreviewableRemoteImage
              v-if="img(transferShotUrl)"
              :url="transferShotUrl"
              alt="划转凭证"
              size="large"
            />
            <span v-else-if="needSubmitTransferProof" class="transfer-cell-placeholder">请在页面底部上传</span>
            <span v-else>—</span>
          </template>
        </van-cell>

        <van-cell title="提交时间" :value="formatDateTime(detail.submitTime ?? detail.createdAt)" />
        <van-cell v-if="detail.auditTime" title="审核时间" :value="formatDateTime(detail.auditTime)" />
        <van-cell v-if="detail.auditRemark" title="审核备注" :value="detail.auditRemark" />
      </van-cell-group>

      <div v-if="showProfitDistributionLink" class="link-row">
        <van-button block round plain type="primary" @click="goDistribution">查看关联利润的分润明细</van-button>
      </div>

      <div v-if="showReviewActions" class="actions">
        <van-button type="primary" block @click="openApproveDialog">通过</van-button>
        <van-button type="danger" block @click="openReject">拒绝</van-button>
      </div>

      <div v-if="showResubmitProfitButton" class="link-row link-row--footer">
        <van-button block round type="primary" @click="goResubmitProfit">利润重新提交</van-button>
      </div>
    </template>
    <EmptyState v-else description="无法加载该结算单" />

    <div v-if="needSubmitTransferProof" class="settlement-transfer-bar">
      <van-button block round type="primary" @click="openTransferSheet">上传划转凭证</van-button>
    </div>

    <van-popup
      v-model:show="transferSheetShow"
      position="bottom"
      round
      teleport="body"
      safe-area-inset-bottom
    >
      <div class="transfer-sheet">
        <div class="transfer-sheet__head">上传划转凭证</div>
        <p class="transfer-sheet__tip">请重新上传给上级的划转凭证。请确认打款到账、凭证真实；提交前需二次确认。</p>
        <div class="transfer-sheet__upload">
          <ImageUploadField
            v-model="transferPendingUrl"
            upload-type="TRANSFER"
            hint="拍照或相册，自动上传"
          />
        </div>
        <van-button
          block
          round
          type="primary"
          :loading="submittingTransfer"
          :disabled="!transferPendingUrl.trim()"
          @click="onConfirmTransferSubmit"
        >
          提交审核
        </van-button>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="approveDialogShow"
      title="确认通过该结算？"
      show-cancel-button
      :before-close="onApproveDialogBeforeClose"
    />

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝（可选填备注）"
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
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import { useAuthStore } from '@/stores/auth'
import { fetchProfitReportById } from '@/api/profitReport'
import {
  fetchSettlementByRootReportId,
  fetchSettlementRowById,
  approveSettlement,
  rejectSettlement,
  submitSettlementTransfer,
} from '@/api/settlement'
import { canCurrentUserUseProfitResubmitFlow } from '@/utils/profitReportSettlementBranch'
import {
  formatMoney,
  formatRate,
  formatDateTime,
  formatSettlementStatus,
  settlementStatusTagType,
} from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())
const loading = ref(true)
const detail = ref(null)
const approveDialogShow = ref(false)
const rejectShow = ref(false)
const rejectRemark = ref('')
const submittingTransfer = ref(false)
const transferSheetShow = ref(false)
const transferPendingUrl = ref('')
/** 结算「已拒绝」时拉取根利润单，用于区分直属退回(可走 resubmit)与链上场景 */
const profitHeadForResubmitGate = ref(null)

/** 结算单主键：来自接口详情，用于提交/审核/上传（勿用路由 id，付款人详情路由里 id 为 root_report_id） */
const detailSettlementPk = computed(() => {
  const d = detail.value
  if (!d) return null
  const n = Number(d.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function parsePositiveLongParam(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function isPendingReview(s) {
  if (!s) return false
  const v = s.status
  if (v === 'PENDING_REVIEW' || v === 'PENDING') return true
  const n = Number(v)
  return n === 3
}

function isPendingSubmitStatus(s) {
  if (!s) return false
  const v = s.status
  if (v === 'PENDING_SUBMIT') return true
  const n = Number(v)
  return n === 2
}

function isSettlementRejectedStatus(val) {
  if (val == null || val === '') return false
  if (typeof val === 'string') {
    const sk = val.trim().toUpperCase().replace(/-/g, '_')
    if (sk === 'REJECTED' || sk === 'SETTLEMENT_REJECTED') return true
  }
  const n = Number(val)
  return n === 5
}

const meId = computed(() => {
  const id = userInfo.value?.id
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function pickFromUserId(d) {
  if (!d) return null
  const fromObj = d.fromUser
  const raw = d.fromUserId ?? fromObj?.id ?? fromObj?.userId
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function pickToUserId(d) {
  if (!d) return null
  const toObj = d.toUser ?? d.toUserInfo
  const raw = d.toUserId ?? toObj?.id ?? toObj?.userId
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 当前用户是否为直属上级（收款方），可审核本条结算 */
const isMeAsReviewingSuperior = computed(() => {
  const d = detail.value
  const mid = meId.value
  if (!d || mid == null) return false
  const reviewerRaw =
    d.reviewerUserId ??
    d.auditByUserId ??
    pickToUserId(d)
  if (reviewerRaw == null) return false
  const rid = Number(reviewerRaw)
  return Number.isFinite(rid) && rid > 0 && rid === mid
})

/** 当前用户是否为付款方（下级/上报人），仅查看自己的单不应出现通过/拒绝 */
const isMeAsSubordinatePayer = computed(() => {
  const d = detail.value
  const mid = meId.value
  if (!d || mid == null) return false
  const fid = pickFromUserId(d)
  return fid != null && fid === mid
})

const isRootUser = computed(() => {
  const u = userInfo.value
  if (!u) return false
  const v = u.isRoot
  if (v === true || v === 1 || v === '1') return true
  if (v === false || v === 0 || v === '0') return false
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true
  return false
})

/**
 * 仅根用户可看全链路分润明细；本人查看自己上报产生的结算单时不展示（与「自己的利润上报详情」一致）。
 */
const showProfitDistributionLink = computed(() => {
  if (isMeAsSubordinatePayer.value) return false
  if (!isRootUser.value) return false
  return profitReportIdForLink.value != null
})

/** 仅待审核且当前用户为应审核的上级时显示通过/拒绝（本人作为上报人打开详情不显示） */
const showReviewActions = computed(() => {
  if (!isPendingReview(detail.value)) return false
  if (isMeAsSubordinatePayer.value) return false
  return isMeAsReviewingSuperior.value
})

/**
 * 结算已拒绝且本人为付款方：仅当根利润单为 RETURNED_TO_APPLICANT 且本人为申报人时，才引导利润 resubmit；
 * 链上被拒（利润单多为 1/2）不应出现该入口。
 */
const showResubmitProfitButton = computed(() => {
  const d = detail.value
  if (!d) return false
  if (!isSettlementRejectedStatus(d.status)) return false
  if (profitReportIdForLink.value == null) return false
  if (!isMeAsSubordinatePayer.value) return false
  const head = profitHeadForResubmitGate.value
  if (!head || typeof head !== 'object') return false
  return canCurrentUserUseProfitResubmitFlow(head, meId.value)
})

const reportNoText = computed(() => {
  const d = detail.value
  if (!d) return ''
  const v = d.reportNo ?? d.profitRecordNo
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
})

/** 结算行 GET /settlements/row/{id}：reportUserNickname 等以详情体为准 */
const settlementReportUserNicknameDisplay = computed(() => {
  const d = detail.value
  return pickStr(d?.reportUserNickname, d?.reportUserName)
})

const settlementReportUserMobileDisplay = computed(() => {
  const d = detail.value
  return pickStr(d?.reportUserMobile)
})

const settlementReportProfitAmountDisplay = computed(() => {
  const d = detail.value
  const raw = d?.profitAmount ?? d?.profitReportAmount
  if (raw === null || raw === undefined || raw === '') return '—'
  return formatMoney(raw)
})

const settlementParentToChildRatioDisplay = computed(() => {
  const d = detail.value
  if (!d) return '—'
  const r = d.parentToChildProfitRatio
  if (r === null || r === undefined || r === '') return '—'
  return formatRate(r)
})

const settlementTagType = computed(() => settlementStatusTagType(detail.value?.status))

/** 支持嵌套 fromUser / 扁平 fromUserNickname 等 */
function pickUserSide(d, side) {
  if (!d) return { nickname: '', mobile: '' }
  const fromObj = d.fromUser
  const toObj = d.toUser ?? d.toUserInfo
  const obj = side === 'from' ? fromObj : toObj
  if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) {
    return {
      nickname: pickStr(obj.nickname, obj.userNickname, obj.name),
      mobile: pickStr(obj.mobile, obj.phone, obj.userMobile),
    }
  }
  if (side === 'from') {
    return {
      nickname: pickStr(d.fromUserNickname),
      mobile: pickStr(d.fromUserMobile),
    }
  }
  return {
    nickname: pickStr(d.toUserNickname),
    mobile: pickStr(d.toUserMobile),
  }
}

const fromProfile = computed(() => pickUserSide(detail.value, 'from'))
const toProfile = computed(() => pickUserSide(detail.value, 'to'))

const toExchangeUidText = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(d.toUserExchangeUid, d.toExchangeUid)
})

const transferShotUrl = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(d.transferScreenshotUrl, d.transferToParentScreenshotUrl)
})

/** 待支付、尚无划转图、且当前用户为付款人 → 需向上级打款并上传凭证 */
const needSubmitTransferProof = computed(() => {
  const d = detail.value
  if (!d || !isPendingSubmitStatus(d)) return false
  if (img(transferShotUrl.value)) return false
  return isMeAsSubordinatePayer.value
})

const profitShotUrl = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(d.profitScreenshotUrl, d.profitImgUrl)
})

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

/** 当前是否「按结算行主键」打开 */
const settlementOpenedByRowRoute = computed(
  () => route.name === 'SettlementDetailByRow' || parsePositiveLongParam(route.params.rowId) != null,
)

const profitReportIdForLink = computed(() => {
  const d = detail.value
  const idFromDetail =
    d && d.rootReportId
  if (idFromDetail != null && idFromDetail !== '') {
    const n = Number(idFromDetail)
    if (Number.isFinite(n) && n > 0) return n
  }
  /** GET /settlements/{id} 路由上的 id 即为 root_report_id，详情体常不带 reportId */
  if (!settlementOpenedByRowRoute.value) {
    const routeRoot = parsePositiveLongParam(route.params.id)
    if (routeRoot != null) return routeRoot
  }
  return null
})

function goDistribution() {
  const id = profitReportIdForLink.value
  if (id == null) return
  router.push({
    name: 'ProfitDistributionDetail',
    params: { profitReportId: String(id) },
  })
}

function goResubmitProfit() {
  const id = profitReportIdForLink.value
  if (id == null) return
  router.push({
    name: 'ProfitReportResubmit',
    params: { profitReportId: String(id) },
  })
}

function txt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function img(u) {
  return u ? String(u) : ''
}

function openTransferSheet() {
  transferPendingUrl.value = ''
  transferSheetShow.value = true
}

async function onConfirmTransferSubmit() {
  const url = transferPendingUrl.value?.trim()
  if (!url) {
    showToast('请先上传划转凭证')
    return
  }
  const id = detailSettlementPk.value
  if (id == null) {
    showToast('无效单据')
    return
  }
  try {
    await showConfirmDialog({
      title: '确认提交',
      message: '提交后上级将审核您的划转凭证，是否确认？',
      confirmButtonText: '确认提交',
      cancelButtonText: '再检查一下',
    })
  } catch {
    return
  }
  submittingTransfer.value = true
  try {
    await submitSettlementTransfer(id, { transferScreenshotUrl: url })
    showToast('已提交，待审核')
    transferSheetShow.value = false
    transferPendingUrl.value = ''
    await load()
  } catch {
    /* 错误已由请求层 Toast */
  } finally {
    submittingTransfer.value = false
  }
}

async function load() {
  const rowId = parsePositiveLongParam(route.params.rowId)
  const rootReportId = parsePositiveLongParam(route.params.id)
  const useRow = route.name === 'SettlementDetailByRow' || rowId != null
  const fetchId = useRow ? rowId : rootReportId
  if (fetchId == null) {
    detail.value = null
    loading.value = false
    transferSheetShow.value = false
    return
  }
  transferSheetShow.value = false
  profitHeadForResubmitGate.value = null
  loading.value = true
  try {
    detail.value = useRow
      ? await fetchSettlementRowById(fetchId)
      : await fetchSettlementByRootReportId(fetchId)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [
    detail.value?.id,
    detail.value?.status,
    isMeAsSubordinatePayer.value,
    profitReportIdForLink.value,
  ],
  async () => {
    profitHeadForResubmitGate.value = null
    const d = detail.value
    const rid = profitReportIdForLink.value
    if (!d || rid == null || !isSettlementRejectedStatus(d.status) || !isMeAsSubordinatePayer.value) return
    try {
      const pr = await fetchProfitReportById(rid)
      profitHeadForResubmitGate.value = pr && typeof pr === 'object' ? pr : null
    } catch {
      profitHeadForResubmitGate.value = null
    }
  },
  { immediate: true },
)

onMounted(load)
watch(
  () => [route.name, route.params.id, route.params.rowId],
  () => load(),
)

function openApproveDialog() {
  if (detailSettlementPk.value == null) {
    showToast('无效单据')
    return
  }
  approveDialogShow.value = true
}

async function onApproveDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const id = detailSettlementPk.value
  if (id == null) return false
  try {
    await approveSettlement(id, {})
    showToast('已通过')
    await load()
    return true
  } catch {
    return false
  }
}

function openReject() {
  rejectRemark.value = ''
  rejectShow.value = true
}

async function onRejectDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const id = detailSettlementPk.value
  if (id == null) return false
  try {
    const remark = rejectRemark.value.trim()
    await rejectSettlement(id, remark ? { remark } : {})
    showToast('已拒绝')
    await load()
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.pad {
  padding: 48px 0;
}
.settlement-report-section {
  margin-bottom: 10px;
}
.link-row {
  padding: 12px 16px 0;
}
.link-row--footer {
  padding: 16px 16px 24px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 12px 24px;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
.pay-amt {
  color: #ee0a24;
  font-weight: 700;
}
.transfer-hint {
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.hint-cell :deep(.van-cell__title) {
  flex: 1;
  max-width: 100%;
}
.transfer-cell-placeholder {
  font-size: 13px;
  color: #969799;
}
.settlement-detail--pad-bottom {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}
.settlement-transfer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: var(--van-background-2, #fff);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}
.transfer-sheet {
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
}
.transfer-sheet__head {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}
.transfer-sheet__tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
}
.transfer-sheet__upload {
  margin-bottom: 20px;
}
</style>
