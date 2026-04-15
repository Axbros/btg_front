<template>
  <div>
    <AppHeader title="利润·重新提交" />
    <van-loading v-if="pageLoading" class="pr-resubmit__loading" vertical>加载中…</van-loading>
    <van-empty v-else-if="!canResubmit" description="当前记录不可重提或不存在" />
    <template v-else>
      
      <van-form scroll-to-error :show-error-message="true" @submit="onSubmit" style="padding-top: 12px">
      <van-cell-group inset>
        <van-notice-bar left-icon="info-o" :scrollable="false" text="已退回待修改：请核对后重新提交利润金额与两张截图。" />
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
              hint="仅向直属上级划转，拍照或相册上传"
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
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { fetchProfitReportById, getProfitReportFlow, resubmitProfitReport } from '@/api/profitReport'
import { isProfitReportReturnedToApplicant, formatProfitRecordStatus } from '@/utils/format'
import BusinessFlowTimeline from '@/components/BusinessFlowTimeline.vue'

const route = useRoute()
const router = useRouter()

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
  return isProfitReportReturnedToApplicant(r.status ?? r.statusCode)
})

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
  const no = r.reportNo ?? r.report_no
  return no != null && String(no).trim() !== '' ? String(no).trim() : ''
})

const flowCurrentStatus = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return null
  const r = flowReport.value
  return f.currentStatus ?? f.current_status ?? r?.flowStatus ?? r?.status ?? null
})

const flowSubmitVersion = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return null
  const r = flowReport.value
  return f.submitVersion ?? f.submit_version ?? r?.submitVersion ?? r?.submit_version ?? null
})

const flowRejectReason = computed(() => {
  const f = flowPayload.value
  if (!f || typeof f !== 'object') return ''
  const r = flowReport.value
  const reason =
    f.lastRejectReason ?? f.last_reject_reason ?? r?.lastRejectReason ?? r?.last_reject_reason ?? ''
  return String(reason).trim()
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
    if (!canResubmit.value) {
      showToast('当前状态不可重提')
      return
    }
    const amt = d.profitAmount ?? d.profit_amount
    profitAmount.value = amt != null && String(amt) !== '' ? String(amt) : ''
    profitScreenshotUrl.value = pickStr(d, 'profitScreenshotUrl', 'profit_screenshot_url')
    transferScreenshotUrl.value = pickStr(
      d,
      'transferScreenshotUrl',
      'transfer_screenshot_url',
      'transferToParentScreenshotUrl',
      'transfer_to_parent_screenshot_url',
    )
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
