<template>
  <div>
    <AppHeader title="申报详情" />
    <div v-if="loading" class="detail__loading">
      <van-loading type="spinner" size="24px">加载中…</van-loading>
    </div>
    <template v-else-if="record">
      <van-cell-group>
      <van-cell title="申 报 人" :value="displayNickname(record.userNickname)" />
        <van-cell title="申报单号" :value="String(record.recordNo ?? record.id ?? '—')" />
        <van-cell title="申报状态" :value="formatProfitRecordStatus(record.status)" />
        
        <van-cell title="策略名称" :value="displayStrategyName(record.strategyName)" />
        <van-cell title="申报盈利" :value="formatMoney(record.profitAmount)" />
        <van-cell title="分佣比例" :value="formatRate(record.commissionRate)" />
        <van-cell title="佣金金额" :value="formatMoney(record.commissionAmount)" />
        <van-cell title="用户净额" :value="formatMoney(record.netAmount)" />
        <van-cell title="收益截图">
          <a v-if="img(record.profitScreenshotUrl)" :href="img(record.profitScreenshotUrl)" target="_blank" rel="noopener">查看</a>
          <span v-else>—</span>
        </van-cell>
        <van-cell title="转账截图">
          <a v-if="img(record.transferScreenshotUrl)" :href="img(record.transferScreenshotUrl)" target="_blank" rel="noopener">查看</a>
          <span v-else>—</span>
        </van-cell>
        <van-cell title="提交时间" :value="formatDateTime(record.submitTime)" />
        <van-cell v-if="record.auditTime" title="审核时间" :value="formatDateTime(record.auditTime)" />
        <!-- <van-cell v-if="record.auditBy != null" title="审核人用户 ID" :value="String(record.auditBy)" /> -->
        <van-cell v-if="record.auditRemark" title="审核备注" :label="record.auditRemark" />
      </van-cell-group>

      <div v-if="isPending" class="detail__actions">
        <van-button type="primary" block plain @click="openApproveDialog">通过</van-button>
        <van-button type="danger" block plain @click="openReject">拒绝</van-button>
      </div>
    </template>
    <EmptyState v-else description="无法加载该申报" />

    <van-dialog
      v-model:show="approveDialogShow"
      title="确认通过该申报？"
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
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  fetchReferrerProfitRecord,
  approveReferrerProfit,
  rejectReferrerProfit,
} from '@/api/profit'
import { formatMoney, formatDateTime, formatRate, formatProfitRecordStatus } from '@/utils/format'

const route = useRoute()

const loading = ref(true)
const record = ref(null)
const approveDialogShow = ref(false)
const rejectShow = ref(false)
const rejectRemark = ref('')

const recordId = computed(() => {
  const id = route.params.id
  const n = Number(id)
  return Number.isFinite(n) ? n : null
})

const isPending = computed(() => Number(record.value?.status) === 1)

function img(u) {
  return u ? String(u) : ''
}

/** ReferrerProfitRecordDetailVo：未设置昵称为 null */
function displayNickname(val) {
  if (val == null || String(val).trim() === '') return '—'
  return String(val)
}

/** 策略不存在或已删为 null */
function displayStrategyName(val) {
  if (val == null || String(val).trim() === '') return '—'
  return String(val)
}

function buildBody(remark) {
  const id = recordId.value
  const body = { profitRecordId: id }
  const r = remark != null ? String(remark).trim() : ''
  if (r) body.remark = r
  return body
}

async function load() {
  const id = recordId.value
  if (id == null) {
    record.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    record.value = await fetchReferrerProfitRecord(id)
  } catch {
    record.value = null
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
  const id = recordId.value
  if (id == null) {
    showToast('无效单据')
    return
  }
  approveDialogShow.value = true
}

async function onApproveDialogBeforeClose(action) {
  if (action === 'cancel') return true
  const id = recordId.value
  if (id == null) {
    showToast('无效单据')
    return false
  }
  try {
    await approveReferrerProfit(buildBody())
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
  const id = recordId.value
  if (id == null) {
    showToast('无效单据')
    return false
  }
  try {
    await rejectReferrerProfit(buildBody(rejectRemark.value))
    showToast('已拒绝')
    await load()
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.detail__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.detail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 12px 24px;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
</style>
