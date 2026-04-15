<template>
  <div>
    <AppHeader title="结算详情" />
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <van-cell-group inset title="利润上报信息" class="settlement-report-section">
        <van-cell title="利润上报单号" :value="txt(reportNoText)" />
        <van-cell title="利润上报人" :value="txt(settlementReportUserNicknameDisplay)" />
        <van-cell title="上报人手机" :value="txt(settlementReportUserMobileDisplay)" />
        <van-cell title="上报总利润">
          <template #value>
            <span class="pay-amt">{{ settlementReportProfitAmountDisplay }}</span>
          </template>
        </van-cell>
        <van-cell title="子级利润比例" :value="settlementParentToChildRatioDisplay" />
      </van-cell-group>

      <van-cell-group inset title="结算信息">
        <van-cell title="上报审核状态">
          <template #value>
            <van-tag :type="settlementTagType" plain round>
              {{ formatSettlementStatus(detail.status) }}
            </van-tag>
          </template>
        </van-cell>

        <!-- <van-cell v-if="rootReportIdText" title="关联根单 ID" :value="rootReportIdText" /> -->
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
            <span class="transfer-hint">请向收款人完成打款后，上传划转凭证提交上级审核。</span>
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
            <van-button
              v-else-if="needSubmitTransferProof"
              type="primary"
              size="small"
              :loading="submittingTransfer"
              @click="onPickTransferProof"
            >
              上传划转凭证
            </van-button>
            <span v-else>—</span>
          </template>
        </van-cell>
        <input
          ref="transferFileRef"
          type="file"
          class="visually-hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,application/pdf"
          @change="onTransferFileChange"
        />
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
        <van-cell title="提交时间" :value="formatDateTime(detail.submitTime ?? detail.createdAt)" />
        <van-cell v-if="detail.auditTime" title="审核时间" :value="formatDateTime(detail.auditTime)" />
        <van-cell v-if="detail.auditRemark" title="审核备注" :label="detail.auditRemark" />
      </van-cell-group>

      <van-cell-group inset title="关联利润·审核链路" class="settlement-profit-flow">
        <van-loading v-if="profitFlowLoading" class="settlement-profit-flow__steps" size="20px" vertical>
          加载链路…
        </van-loading>
        <template v-else-if="rootReportIdForFlow == null">
          <van-empty description="结算详情未包含根利润单 ID（如 reportId、rootReportId），无法加载分润链路" />
        </template>
        <template v-else-if="profitFlowPayload">
          <ProfitLayerList
            :layers="profitFlowLayers"
            :report-user-name="profitFlowReportUserName"
            :report-profit-amount="profitFlowRootProfitAmount"
            :report-financials-masked="profitFlowRootFinancialsMasked"
          />
          <van-empty v-if="!profitFlowLayers.length" description="暂无链路信息" />
        </template>
        <van-empty v-else description="链路接口未返回数据或加载失败" />
        <!-- <div v-if="!profitFlowLoading && profitFlowLayers.length" class="settlement-profit-flow__link">
          <van-button size="small" plain type="primary" round block @click="goProfitReportFlow">
            查看利润单状态流页
          </van-button>
        </div> -->
      </van-cell-group>

      <div v-if="showProfitDistributionLink" class="link-row">
        <van-button block round plain type="primary" @click="goDistribution">查看关联利润的分润明细</van-button>
      </div>

      <div v-if="showReviewActions" class="actions">
        <van-button type="primary" block plain @click="openApproveDialog">通过</van-button>
        <van-button type="danger" block plain @click="openReject">拒绝</van-button>
      </div>
    </template>
    <EmptyState v-else description="无法加载该结算单" />

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
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import ProfitLayerList from '@/components/ProfitLayerList.vue'
import { useAuthStore } from '@/stores/auth'
import { uploadFile, FILE_UPLOAD_TYPES } from '@/api/files'
import {
  fetchSettlementByRootReportId,
  fetchSettlementRowById,
  getSettlementProfitFlow,
  approveSettlement,
  rejectSettlement,
  submitSettlementTransfer,
} from '@/api/settlement'
import {
  formatMoney,
  formatRate,
  formatDateTime,
  formatSettlementStatus,
  settlementStatusTagType,
} from '@/utils/format'
import { pickProfitFlowLayers, unwrapProfitFlowDetailPayload } from '@/utils/profitFlowLayer'

const route = useRoute()
const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())
const loading = ref(true)
const detail = ref(null)
const approveDialogShow = ref(false)
const rejectShow = ref(false)
const rejectRemark = ref('')
const transferFileRef = ref(null)
const submittingTransfer = ref(false)
const profitFlowPayload = ref(null)
const profitFlowLoading = ref(false)

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

const meId = computed(() => {
  const id = userInfo.value?.id
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function pickFromUserId(d) {
  if (!d) return null
  const fromObj = d.fromUser ?? d.from_user
  const raw = d.fromUserId ?? d.from_user_id ?? fromObj?.id ?? fromObj?.userId ?? fromObj?.user_id
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function pickToUserId(d) {
  if (!d) return null
  const toObj = d.toUser ?? d.to_user ?? d.toUserInfo ?? d.to_user_info
  const raw = d.toUserId ?? d.to_user_id ?? toObj?.id ?? toObj?.userId ?? toObj?.user_id
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
    d.reviewer_user_id ??
    d.auditByUserId ??
    d.audit_by_user_id ??
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
  const v = u.isRoot ?? u.is_root
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

const reportNoText = computed(() => {
  const d = detail.value
  if (!d) return ''
  const v = d.reportNo ?? d.report_no ?? d.profitRecordNo ?? d.profit_record_no
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
})

/** 结算行 GET /settlements/row/{id}：reportUserNickname；可与 profit-flow 的 reportUserName 互补 */
const settlementReportUserNicknameDisplay = computed(() => {
  const p = profitFlowPayload.value
  const d = detail.value
  return pickStr(
    d?.reportUserNickname,
    d?.report_user_nickname,
    p?.reportUserName,
    p?.report_user_name,
    d?.reportUserName,
    d?.report_user_name,
  )
})

const settlementReportUserMobileDisplay = computed(() => {
  const p = profitFlowPayload.value
  const d = detail.value
  return pickStr(
    d?.reportUserMobile,
    d?.report_user_mobile,
    p?.reportUserMobile,
    p?.report_user_mobile,
  )
})

const settlementReportProfitAmountDisplay = computed(() => {
  const p = profitFlowPayload.value
  const d = detail.value
  const raw =
    p?.profitAmount ??
    p?.profit_amount ??
    d?.profitAmount ??
    d?.profit_amount ??
    d?.profitReportAmount ??
    d?.profit_report_amount
  if (raw === null || raw === undefined || raw === '') return '—'
  return formatMoney(raw)
})

const settlementParentToChildRatioDisplay = computed(() => {
  const d = detail.value
  if (!d) return '—'
  const r = d.parentToChildProfitRatio ?? d.parent_to_child_profit_ratio
  if (r === null || r === undefined || r === '') return '—'
  return formatRate(r)
})

const settlementTagType = computed(() => settlementStatusTagType(detail.value?.status))

const rootReportIdText = computed(() => {
  const d = detail.value
  if (!d) return ''
  const v = d.rootReportId ?? d.root_report_id
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
})

/** 支持嵌套 fromUser / 扁平 fromUserNickname 等 */
function pickUserSide(d, side) {
  if (!d) return { nickname: '', mobile: '' }
  const fromObj = d.fromUser ?? d.from_user
  const toObj = d.toUser ?? d.to_user ?? d.toUserInfo ?? d.to_user_info
  const obj = side === 'from' ? fromObj : toObj
  if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) {
    return {
      nickname: pickStr(obj.nickname, obj.userNickname, obj.user_nickname, obj.name),
      mobile: pickStr(obj.mobile, obj.phone, obj.userMobile, obj.user_mobile),
    }
  }
  if (side === 'from') {
    return {
      nickname: pickStr(d.fromUserNickname, d.from_user_nickname),
      mobile: pickStr(d.fromUserMobile, d.from_user_mobile),
    }
  }
  return {
    nickname: pickStr(d.toUserNickname, d.to_user_nickname),
    mobile: pickStr(d.toUserMobile, d.to_user_mobile),
  }
}

const fromProfile = computed(() => pickUserSide(detail.value, 'from'))
const toProfile = computed(() => pickUserSide(detail.value, 'to'))

const toExchangeUidText = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(
    d.toUserExchangeUid,
    d.to_user_exchange_uid,
    d.toExchangeUid,
    d.to_exchange_uid,
  )
})

const transferShotUrl = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(
    d.transferScreenshotUrl,
    d.transfer_screenshot_url,
    d.transferToParentScreenshotUrl,
    d.transfer_to_parent_screenshot_url,
  )
})

/** 待提交凭证、尚无划转图、且当前用户为付款人 → 需向上级打款并上传凭证 */
const needSubmitTransferProof = computed(() => {
  const d = detail.value
  if (!d || !isPendingSubmitStatus(d)) return false
  if (img(transferShotUrl.value)) return false
  return isMeAsSubordinatePayer.value
})

const profitShotUrl = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(
    d.profitScreenshotUrl,
    d.profit_screenshot_url,
    d.profitImgUrl,
    d.profit_img_url,
  )
})

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

/** 当前是否「按结算行主键」打开（勿把 rowId 当利润根单去请求 profit-flow） */
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

/** 与 GET /settlements/{rootReportId}/profit-flow 路径一致 */
const rootReportIdForFlow = computed(() => profitReportIdForLink.value)

const profitFlowLayers = computed(() => pickProfitFlowLayers(profitFlowPayload.value))

const profitFlowReportUserName = computed(() => {
  const p = profitFlowPayload.value
  if (!p || typeof p !== 'object') return ''
  const v =
    p.reportUserName ??
    p.report_user_name ??
    p.reportUserNickname ??
    p.report_user_nickname
  if (v == null || String(v).trim() === '') return ''
  return String(v).trim()
})

const profitFlowRootProfitAmount = computed(() => {
  const p = profitFlowPayload.value
  if (!p || typeof p !== 'object') return null
  const raw = p.profitAmount ?? p.profit_amount
  if (raw === null || raw === undefined || raw === '') return null
  return raw
})

const profitFlowRootFinancialsMasked = computed(() => {
  const p = profitFlowPayload.value
  if (!p || typeof p !== 'object') return false
  return p.financialsMasked === true || p.financials_masked === true
})

async function loadProfitFlow() {
  profitFlowPayload.value = null
  const rootId = rootReportIdForFlow.value
  if (rootId == null) return
  profitFlowLoading.value = true
  try {
    const data = await getSettlementProfitFlow(rootId)
    profitFlowPayload.value =
      unwrapProfitFlowDetailPayload(data) ?? (data && typeof data === 'object' ? data : null)
  } catch {
    profitFlowPayload.value = null
  } finally {
    profitFlowLoading.value = false
  }
}

function goDistribution() {
  const id = profitReportIdForLink.value
  if (id == null) return
  router.push({
    name: 'ProfitDistributionDetail',
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

function onPickTransferProof() {
  transferFileRef.value?.click()
}

async function onTransferFileChange(ev) {
  const input = ev.target
  const file = input.files?.[0]
  if (input) input.value = ''
  if (!file || detailSettlementPk.value == null) return
  submittingTransfer.value = true
  try {
    const vo = await uploadFile(file, FILE_UPLOAD_TYPES.TRANSFER)
    const url = vo?.url ?? vo?.data?.url
    if (!url || String(url).trim() === '') {
      showToast('上传未返回地址')
      return
    }
    await submitSettlementTransfer(detailSettlementPk.value, { transferScreenshotUrl: String(url).trim() })
    showToast('已提交，待上级审核')
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
    return
  }
  loading.value = true
  profitFlowPayload.value = null
  try {
    detail.value = useRow
      ? await fetchSettlementRowById(fetchId)
      : await fetchSettlementByRootReportId(fetchId)
    await loadProfitFlow()
  } catch {
    detail.value = null
    profitFlowPayload.value = null
  } finally {
    loading.value = false
  }
}

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
.settlement-profit-flow {
  margin-top: 12px;
}
.settlement-profit-flow__steps {
  padding: 0 8px 8px;
  min-height: 40px;
}
.settlement-profit-flow__link {
  padding: 0 16px 12px;
}
.link-row {
  padding: 12px 16px 0;
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
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
