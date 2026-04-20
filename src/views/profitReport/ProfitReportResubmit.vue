<template>
  <div class="profit-report-shell">
    <AppHeader title="利润·重新提交" />
    <div class="profit-report-shell__scroll">
      <van-loading v-if="pageLoading" class="pr-resubmit__loading pr-resubmit__fill" vertical>加载中…</van-loading>
      <div v-else-if="settlementChainOnlyHint" class="pr-resubmit__fill pr-resubmit__misroute">
        <van-empty description="当前利润单在结算链中，请重新上传给团队长的划转凭证" />
        <van-button block round type="primary" class="pr-resubmit__misroute-btn" @click="goPendingPaySettlements">
          前往待支付结算
        </van-button>
      </div>
      <van-empty v-else-if="!canResubmit" class="pr-resubmit__fill" description="当前记录不可重提或不存在" />
      <template v-else>
      <van-form scroll-to-error :show-error-message="true" class="pr-resubmit__form" @submit="onSubmit">
      <van-cell-group inset>
        <van-notice-bar
          left-icon="info-o"
          :scrollable="false"
          wrapable
          :text="returnNoticeText"
        />
        <van-field
          v-model="profitAmount"
          name="profitAmount"
          label="总利润"
          type="number"
          placeholder="≥ 0.01"
          required
          :rules="[
            { required: true, message: '请填写金额' },
            { validator: (v) => Number(v) >= 0.01, message: '金额至少 0.01' },
          ]"
        />
        <van-field
          v-model="profitScreenshotUrl"
          name="profitScreenshotUrl"
          label="利润凭证"
          readonly
          required
          :rules="[{ required: true, message: '请上传利润凭证' }]"
        >
          <template #input>
            <ImageUploadField v-model="profitScreenshotUrl" upload-type="PROFIT" hint="拍照或相册，自动上传" />
          </template>
        </van-field>
        <van-field
          v-model="transferScreenshotUrl"
          name="transferScreenshotUrl"
          label="划转凭证"
          readonly
          required
          :rules="[{ required: true, message: '请上传划转凭证' }]"
        >
          <template #input>
            <ImageUploadField
              v-model="transferScreenshotUrl"
              upload-type="TRANSFER"
              hint="仅向直属团队长划转，拍照或相册上传"
            />
          </template>
        </van-field>
      </van-cell-group>
      <!-- <van-cell-group inset title="审核链路" class="pr-resubmit__flow">
        <van-cell v-if="flowReportNo" title="单号" :value="flowReportNo" />
        <van-cell v-if="flowCurrentStatus != null" title="当前状态" :value="formatProfitRecordStatus(flowCurrentStatus)" />
        <van-cell v-if="flowSubmitVersion != null" title="提交版本" :value="String(flowSubmitVersion)" />
        <van-cell v-if="flowRejectReason" title="最近退回原因" :label="flowRejectReason" />
        <div class="pr-resubmit__flow-steps">
          <van-loading v-if="flowLoading" size="20px" vertical>加载链路…</van-loading>
          <BusinessFlowTimeline v-else :nodes="flowNodes" />
        </div>
        <div v-if="!flowLoading && flowNodes.length" class="pr-resubmit__flow-link">
          <van-button size="small" plain type="primary" round block @click="goFullFlow">查看完整流转页</van-button>
        </div>
      </van-cell-group> -->
      <div class="actions">
        <van-button round block type="primary" native-type="submit" :loading="submitting">重新提交</van-button>
      </div>
    </van-form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { fetchProfitReportById, getProfitReportFlow, resubmitProfitReport } from '@/api/profitReport'
import { formatProfitRecordStatus } from '@/utils/format'
import {
  canCurrentUserUseProfitResubmitFlow,
  isProfitInDirectReviewOrSettlementChain,
} from '@/utils/profitReportSettlementBranch'
import BusinessFlowTimeline from '@/components/BusinessFlowTimeline.vue'

const route = useRoute()
const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

const pageLoading = ref(true)
const submitting = ref(false)
const raw = ref(null)
const flowPayload = ref(null)
const flowLoading = ref(false)
const profitAmount = ref('')
const profitScreenshotUrl = ref('')
const transferScreenshotUrl = ref('')

const reportId = computed(() => {
  const n = Number(route.params.profitReportId)
  return Number.isFinite(n) && n > 0 ? n : null
})

const canResubmit = computed(() => {
  const r = raw.value
  if (!r || typeof r !== 'object') return false
  return canCurrentUserUseProfitResubmitFlow(r, userInfo.value?.id)
})

/** 误入 resubmit 页：链上阶段应去结算补划转，不要提示重填利润金额 */
const settlementChainOnlyHint = computed(() => {
  const r = raw.value
  if (!r || typeof r !== 'object') return false
  if (canResubmit.value) return false
  return isProfitInDirectReviewOrSettlementChain(r.status ?? r.statusCode)
})

function goPendingPaySettlements() {
  router.replace({ name: 'PendingPaySettlements', query: { status: '2' } })
}

function pickFlowNodes(d) {
  if (!d || typeof d !== 'object') return []
  const n =
    d.nodes ??
    d.flowNodes ??
    d.nodeList ??
    d.businessFlowNodes ??
    d.records ??
    d.steps
  return Array.isArray(n) ? n : []
}

const flowNodes = computed(() => pickFlowNodes(flowPayload.value))

const flowReport = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return null
  const r = f.report
  return r && typeof r === 'object' ? r : null
})

const flowReportNo = computed(() => {
  const r = flowReport.value
  if (!r) return ''
  const no = r.reportNo
  return no != null && String(no).trim() !== '' ? String(no).trim() : ''
})

const flowCurrentStatus = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return null
  const r = flowReport.value
  return f.currentStatus ?? r?.flowStatus ?? r?.status ?? null
})

const flowSubmitVersion = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return null
  const r = flowReport.value
  return f.submitVersion ?? r?.submitVersion ?? null
})

const flowRejectReason = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return ''
  const r = flowReport.value
  const reason =
    f.lastRejectReason ??
    f.rejectReason ??
    f.RejectReason ??
    r?.lastRejectReason ??
    r?.rejectReason ??
    r?.RejectReason ??
    ''
  return String(reason).trim()
})

const flowLastRejectByNickname = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return ''
  const nick = f.lastRejectByNickname ?? f.rejectByNickname
  if (nick != null && String(nick).trim() !== '') return String(nick).trim()
  const r = flowReport.value
  const rn = r?.lastRejectByNickname ?? r?.rejectByNickname
  return rn != null && String(rn).trim() !== '' ? String(rn).trim() : ''
})

/** 与 /profit-reports/:id/flow 的 lastRejectReason、lastRejectByNickname 对齐 */
const returnNoticeText = computed(() => {
  
  const reason = flowRejectReason.value
  const by = flowLastRejectByNickname.value
  if (by && reason) return `${by}:${reason}`
  if (reason) return `${reason}`
  if (by) return `${by}`
  const d = raw.value
  if (d && typeof d === 'object') {
    const fb = pickStr(d, 'lastRejectReason', 'rejectReason', 'auditRemark')
    if (fb) return `${fb}`
  }
  return "请核对后重新提交利润金额与两张截图。"
})

function goFullFlow() {
  const id = reportId.value
  if (id == null) return
  router.push({ name: 'ProfitReportFlow', params: { profitReportId: String(id) } })
}

function pickStr(obj, ...keys) {
  if (!obj) return ''
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

async function load() {
  const id = reportId.value
  pageLoading.value = true
  raw.value = null
  flowPayload.value = null
  if (id == null) {
    pageLoading.value = false
    return
  }
  try {
    const d = await fetchProfitReportById(id)
    raw.value = d && typeof d === 'object' ? d : null
    const r = raw.value
    const uid = userInfo.value?.id
    if (!canCurrentUserUseProfitResubmitFlow(r, uid)) {
      const chain = r && isProfitInDirectReviewOrSettlementChain(r.status ?? r.statusCode)
      if (!chain) showToast('当前状态不可重提')
      return
    }
    const amt = d.profitAmount
    profitAmount.value = amt != null && String(amt) !== '' ? String(amt) : ''
    profitScreenshotUrl.value = pickStr(d, 'profitScreenshotUrl')
    transferScreenshotUrl.value = pickStr(d, 'transferScreenshotUrl', 'transferToParentScreenshotUrl')
    flowLoading.value = true
    try {
      const flow = await getProfitReportFlow(id)
      flowPayload.value = flow && typeof flow === 'object' ? flow : null
    } catch {
      flowPayload.value = null
    } finally {
      flowLoading.value = false
    }
  } catch {
    raw.value = null
    flowPayload.value = null
  } finally {
    pageLoading.value = false
  }
}

watch(reportId, () => load(), { immediate: true })

async function onSubmit() {
  const id = reportId.value
  if (id == null) return
  submitting.value = true
  try {
    await resubmitProfitReport(id, {
      profitAmount: Number(profitAmount.value),
      profitScreenshotUrl: profitScreenshotUrl.value.trim(),
      transferScreenshotUrl: transferScreenshotUrl.value.trim(),
    })
    showToast('已重新提交')
    router.replace('/profit-report/mine')
  } catch {
    /* 请求层 Toast */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.pr-resubmit__loading {
  padding: 48px 0;
}
.pr-resubmit__fill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.pr-resubmit__misroute {
  padding: 24px 16px;
  width: 100%;
  box-sizing: border-box;
}
.pr-resubmit__misroute-btn {
  margin-top: 16px;
  max-width: 320px;
  width: 100%;
}
.pr-resubmit__form {
  padding-top: 12px;
  padding-bottom: env(safe-area-inset-bottom);
}
.actions {
  margin: 20px 16px 0;
}
.pr-resubmit__flow {
  margin: 12px 0 0;
}
.pr-resubmit__flow-steps {
  padding: 0 16px 8px;
  min-height: 48px;
}
.pr-resubmit__flow-link {
  padding: 0 16px 12px;
}
</style>
