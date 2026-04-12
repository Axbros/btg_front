<template>
  <van-cell-group v-if="detail">
    <van-cell title="归仓单号" :value="txt(pick('repayNo', 'repay_no'))" />
    <van-cell title="归仓状态">
      <template #value>
        <van-tag :type="repayStatusTagType(pick('status', 'status'))" plain round>
          {{ formatRepayStatus(pick('status', 'status')) }}
        </van-tag>
      </template>
    </van-cell>
    <van-cell title="用户昵称" :value="txt(pick('nickname', 'nick_name'))" />
    <van-cell title="用户手机" :value="txt(pick('mobile', 'mobile'))" />
    <!-- <van-cell title="关联补仓 ID" :value="txt(pick('replenishApplyId', 'replenish_apply_id'))" /> -->
    <van-cell
      title="补仓金额"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="replenishAmountDisplay"
    />
    <van-cell
      title="归还金额"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="formatMoney(pick('repayAmount', 'repay_amount'))"
    />
    <van-cell
      title="剩余待还"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="remainingToRepayText"
    />
    <van-cell title="归仓转账凭证">
      <template #value>
        <PreviewableRemoteImage v-if="screenshotUrl" :url="screenshotUrl" alt="归仓转账凭证" size="large" />
        <span v-else>—</span>
      </template>
    </van-cell>
    <van-cell title="归仓提交时间" :value="formatDateTime(pick('submitTime', 'submit_time'))" />
    <van-cell-group v-if="replenishmentApply"  title="关联补仓申请" class="repay-detail__repl-group">
      <van-cell title="申请单号" :value="txt(pickReplen('applyNo', 'apply_no'))" />
      <van-cell title="补仓状态">
        <template #value>
          <van-tag :type="replenishmentStatusTagType(pickReplen('status', 'status'))" plain round>
            {{ formatReplenishmentStatus(pickReplen('status', 'status')) }}
          </van-tag>
        </template>
      </van-cell>
      <van-cell title="底仓本金" :value="formatMoney(pickReplen('principalAmount', 'principal_amount'))" />
      <van-cell title="申报余额" :value="formatMoney(pickReplen('balanceAmount', 'balance_amount'))" />
      <van-cell title="已还金额" :value="formatMoney(pickReplen('repaidAmount', 'repaid_amount'))" />
      <van-cell title="待还金额" :value="formatMoney(pickReplen('pendingRepayAmount', 'pending_repay_amount'))" />
      <van-cell title="补仓截图">
        <template #value>
          <PreviewableRemoteImage v-if="replBalanceShotUrl" :url="replBalanceShotUrl" alt="余额截图" size="large" />
          <span v-else>—</span>
        </template>
      </van-cell>
      <van-cell v-if="replTransferShotUrl" title="资方补仓凭证">
        <template #value>
          <PreviewableRemoteImage :url="replTransferShotUrl" alt="资方转账凭证" size="large" />
        </template>
      </van-cell>
      <van-cell
        v-if="txt(pickReplen('transferRemark', 'transfer_remark')) !== '—'"
        title="资方转账备注"
        :value="txt(pickReplen('transferRemark', 'transfer_remark'))"
      />
      <van-cell title="补仓提交时间" :value="formatDateTime(pickReplen('submitTime', 'submit_time'))" />
      <van-cell title="补仓审核时间" :value="formatDateTime(pickReplen('auditTime', 'audit_time'))" />
    </van-cell-group>
    <van-cell v-else title="关联补仓申请" value="暂无" />
    <van-cell v-if="txt(pick('remark', 'remark')) !== '—'" title="备注" :value="txt(pick('remark', 'remark'))" />
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import {
  formatMoney,
  formatDateTime,
  formatRepayStatus,
  repayStatusTagType,
  formatReplenishmentStatus,
  replenishmentStatusTagType,
} from '@/utils/format'

const props = defineProps({
  /** 归仓详情 VO（含 replenishmentApply） */
  detail: { type: Object, default: null },
})

const replenishmentApply = computed(() => {
  const d = props.detail
  if (!d || typeof d !== 'object') return null
  return d.replenishmentApply ?? d.replenishment_apply ?? null
})

function pickFrom(obj, camel, snake) {
  if (!obj || typeof obj !== 'object') return null
  if (camel === snake) return obj[camel]
  return obj[camel] ?? obj[snake]
}

function pick(camel, snake) {
  return pickFrom(props.detail, camel, snake)
}

function pickReplen(camel, snake) {
  return pickFrom(replenishmentApply.value, camel, snake)
}

function txt(v) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s !== '' ? s : '—'
}

const screenshotUrl = computed(() => {
  const d = props.detail
  if (!d) return ''
  const u = d.repayScreenshotUrl ?? d.repay_screenshot_url
  return u ? String(u) : ''
})

const replenishAmountDisplay = computed(() => {
  const v = pickReplen('replenishAmount', 'replenish_amount')
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatMoney(n)
})

const replBalanceShotUrl = computed(() => {
  const u = pickReplen('balanceScreenshotUrl', 'balance_screenshot_url')
  return u ? String(u) : ''
})

const replTransferShotUrl = computed(() => {
  const u = pickReplen('transferScreenshotUrl', 'transfer_screenshot_url')
  return u ? String(u) : ''
})

const remainingToRepayText = computed(() => {
  const d = props.detail
  if (!d) return '—'
  const app = replenishmentApply.value
  const replenish = Number(app?.replenishAmount ?? app?.replenish_amount)
  const repay = Number(d.repayAmount ?? d.repay_amount)
  const a = Number.isFinite(replenish) ? replenish : 0
  const b = Number.isFinite(repay) ? repay : 0
  return formatMoney(a - b)
})

</script>

<style scoped>
:deep(.repay-detail__amount) {
  color: #ee0a24;
  font-weight: 700;
}
.repay-detail__repl-group {
  margin-top: 8px;
}
</style>
