<template>
  <div>
    <AppHeader title="结算详情" />
    <van-loading v-if="loading" class="pad" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <van-cell-group inset>
        <!-- <van-cell title="结算单号" :value="txt(detail.id)" /> -->
        <van-cell title="利润上报单号" :value="txt(reportNoText)" />
        <van-cell title="上报审核状态" :value="formatSettlementStatus(detail.status)" />

        <!-- <van-cell v-if="rootReportIdText" title="关联根单 ID" :value="rootReportIdText" /> -->
        <van-cell title="付款人昵称" :value="txt(fromProfile.nickname)" />
        <van-cell title="付款人手机" :value="txt(fromProfile.mobile)" />
        <van-cell title="收款人昵称" :value="txt(toProfile.nickname)" />
        <!-- <van-cell title="收款人手机" :value="txt(toProfile.mobile)" /> -->
        <van-cell title="应支付金额" :value="formatMoney(detail.payAmount)" />
        <van-cell title="划转凭证">
          <a v-if="img(transferShotUrl)" :href="img(transferShotUrl)" target="_blank" rel="noopener">查看</a>
          <span v-else>—</span>
        </van-cell>
        <van-cell title="利润截图">
          <a v-if="img(profitShotUrl)" :href="img(profitShotUrl)" target="_blank" rel="noopener">查看</a>
          <span v-else>—</span>
        </van-cell>
        <van-cell title="上缴截图（利润单）">
          <a v-if="img(reportTransferShotUrl)" :href="img(reportTransferShotUrl)" target="_blank" rel="noopener">查看</a>
          <span v-else>—</span>
        </van-cell>
        <van-cell title="提交时间" :value="formatDateTime(detail.submitTime ?? detail.createdAt)" />
        <van-cell v-if="detail.auditTime" title="审核时间" :value="formatDateTime(detail.auditTime)" />
        <van-cell v-if="detail.auditRemark" title="审核备注" :label="detail.auditRemark" />
      </van-cell-group>

      <div v-if="profitReportIdForLink" class="link-row">
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
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchSettlementById, approveSettlement, rejectSettlement } from '@/api/settlement'
import { formatMoney, formatDateTime, formatSettlementStatus } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const detail = ref(null)
const approveDialogShow = ref(false)
const rejectShow = ref(false)
const rejectRemark = ref('')

const settlementId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function isPendingReview(s) {
  if (!s) return false
  const v = s.status
  if (v === 'PENDING_REVIEW' || v === 'PENDING') return true
  const n = Number(v)
  return n === 3
}

const showReviewActions = computed(() => isPendingReview(detail.value))

const reportNoText = computed(() => {
  const d = detail.value
  if (!d) return ''
  const v = d.reportNo ?? d.report_no ?? d.profitRecordNo ?? d.profit_record_no
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
})

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

const reportTransferShotUrl = computed(() => {
  const d = detail.value
  if (!d) return ''
  return pickStr(d.reportTransferScreenshotUrl, d.report_transfer_screenshot_url)
})

function pickStr(...candidates) {
  for (const v of candidates) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

const profitReportIdForLink = computed(() => {
  const d = detail.value
  if (!d) return null
  const id = d.rootReportId ?? d.profitReportId ?? d.profitRecordId
  if (id == null) return null
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
})

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

async function load() {
  const id = settlementId.value
  if (id == null) {
    detail.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    detail.value = await fetchSettlementById(id)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => load(),
)

function openApproveDialog() {
  if (settlementId.value == null) {
    showToast('无效单据')
    return
  }
  approveDialogShow.value = true
}

async function onApproveDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const id = settlementId.value
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
  const id = settlementId.value
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
</style>
