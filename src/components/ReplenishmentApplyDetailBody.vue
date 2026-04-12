<template>
  <van-cell-group v-if="detail">
    <van-cell title="申请单号" :value="txt(pick('applyNo', 'apply_no'))" />
    <van-cell title="补仓状态">
      <template #value>
        <van-tag :type="replenishmentStatusTagType(pick('status', 'status'))" plain round>
          {{ formatReplenishmentStatus(pick('status', 'status')) }}
        </van-tag>
      </template>
    </van-cell>
    <van-cell title="底仓本金" :value="formatMoney(pick('principalAmount', 'principal_amount'))" />
    <van-cell title="申报余额" :value="formatMoney(pick('balanceAmount', 'balance_amount'))" />
    <van-cell title="补仓额度" :value="formatMoney(pick('replenishAmount', 'replenish_amount'))" />
    <!-- <van-cell title="已通过额度" :value="formatMoney(pick('approvedAmount', 'approved_amount'))" /> -->
    <van-cell title="归仓额度" :value="formatMoney(pick('repaidAmount', 'repaid_amount'))" />
    <van-cell title="待审归仓" :value="formatMoney(pick('pendingRepayAmount', 'pending_repay_amount'))" />
    <van-cell title="剩余待归" :value="formatMoney(pick('remainingAmount', 'remaining_amount'))" />
    <van-cell title="余额截图">
      <template #value>
        <PreviewableRemoteImage v-if="balanceShotUrl" :url="balanceShotUrl" alt="余额截图" size="large" />
        <span v-else>—</span>
      </template>
    </van-cell>
    <van-cell v-if="transferShotUrl" title="资方凭证">
      <template #value>
        <PreviewableRemoteImage :url="transferShotUrl" alt="资方转账凭证" size="large" />
      </template>
    </van-cell>
    <van-cell
      v-if="txt(pick('transferRemark', 'transfer_remark')) !== '—'"
      title="资方备注"
      :value="txt(pick('transferRemark', 'transfer_remark'))"
    />
    <van-cell title="提交时间" :value="formatDateTime(pick('submitTime', 'submit_time'))" />
    <van-cell title="审核时间" :value="formatDateTime(pick('auditTime', 'audit_time'))" />
    <!-- <van-cell v-if="txt(pick('auditBy', 'audit_by')) !== '—'" title="审核人 ID" :value="txt(pick('auditBy', 'audit_by'))" /> -->
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import {
  formatMoney,
  formatDateTime,
  formatReplenishmentStatus,
  replenishmentStatusTagType,
} from '@/utils/format'

const props = defineProps({
  /** 补仓申请完整 VO */
  detail: { type: Object, default: null },
})

function pickFrom(obj, camel, snake) {
  if (!obj || typeof obj !== 'object') return null
  if (camel === snake) return obj[camel]
  return obj[camel] ?? obj[snake]
}

function pick(camel, snake) {
  return pickFrom(props.detail, camel, snake)
}

function txt(v) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s !== '' ? s : '—'
}

const balanceShotUrl = computed(() => {
  const u = pick('balanceScreenshotUrl', 'balance_screenshot_url')
  return u ? String(u) : ''
})

const transferShotUrl = computed(() => {
  const u = pick('transferScreenshotUrl', 'transfer_screenshot_url')
  return u ? String(u) : ''
})
</script>
