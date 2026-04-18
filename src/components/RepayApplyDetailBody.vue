<template>
  <van-cell-group title="归仓详情" inset v-if="detail">
    <van-cell title="归仓单号" :value="txt(pick('repayNo'))" />
    <van-cell title="本笔归仓状态">
      <template #value>
        <van-tag :type="repayStatusTagType(pick('status'))" plain round>
          {{ formatRepayStatus(pick('status')) }}
        </van-tag>
      </template>
    </van-cell>
    <van-cell title="补仓用户姓名" :value="txt(pick('nickname'))" />
    <van-cell title="补仓用户手机" :value="txt(pick('mobile'))" />
    <!-- <van-cell title="关联补仓 ID" :value="txt(pick('replenishApplyId'))" /> -->
    <van-cell
      title="申请补仓额度"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="replenishAmountDisplay"
    />
    <van-cell
      title="申请归仓金额"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="formatMoney(pick('repayAmount'))"
    />
    <!-- <van-cell
      title="剩余待归"
      title-class="repay-detail__amount"
      value-class="repay-detail__amount"
      :value="remainingToRepayText"
    /> -->
    <van-cell title="归仓转账凭证">
      <template #value>
        <PreviewableRemoteImage v-if="screenshotUrl" :url="screenshotUrl" alt="归仓转账凭证" size="large" />
        <span v-else>—</span>
      </template>
    </van-cell>
    <van-cell title="归仓提交时间" :value="formatDateTime(pick('submitTime'))" />
    
    <van-cell v-if="txt(pick('remark')) !== '—'" title="备注" :value="txt(pick('remark'))" />
  </van-cell-group>

  <van-cell-group v-if="replenishmentApply"  inset title="关联补仓" class="repay-detail__repl-group">
      <van-cell title="补仓单号" :value="txt(pickReplen('applyNo'))" />
      <van-cell title="补仓状态">
        <template #value>
          <van-tag :type="replenishmentStatusTagType(pickReplen('status'))" plain round>
            {{ formatReplenishmentStatus(pickReplen('status')) }}
          </van-tag>
        </template>
      </van-cell>
      <van-cell title="底仓本金" :value="formatMoney(pickReplen('principalAmount'))" />
      <van-cell
        title="申报余额"
        :value="formatMoney(pickReplen('balanceAmount'))"
        value-class="repay-detail__amount"
      />
      <van-cell
        title="已还金额"
        :value="formatMoney(pickReplen('repaidAmount'))"
        value-class="repay-detail__amount"
      />
      <!-- <van-cell title="待还金额" :value="formatMoney(pickReplen('pendingRepayAmount'))" /> -->
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
        v-if="txt(pickReplen('transferRemark')) !== '—'"
        title="资方转账备注"
        :value="txt(pickReplen('transferRemark'))"
      />
      <van-cell title="补仓提交时间" :value="formatDateTime(pickReplen('submitTime'))" />
      <van-cell title="补仓审核时间" :value="formatDateTime(pickReplen('auditTime'))" />
    </van-cell-group>
    <van-cell v-else title="关联补仓申请" value="暂无" />
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
  return d.replenishmentApply ?? null
})

function pick(key) {
  const o = props.detail
  if (!o || typeof o !== 'object') return null
  return o[key] ?? null
}

function pickReplen(key) {
  const o = replenishmentApply.value
  if (!o || typeof o !== 'object') return null
  return o[key] ?? null
}

function txt(v) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s !== '' ? s : '—'
}

const screenshotUrl = computed(() => {
  const d = props.detail
  if (!d) return ''
  const u = d.repayScreenshotUrl
  return u ? String(u) : ''
})

const replenishAmountDisplay = computed(() => {
  const v = pickReplen('replenishAmount')
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatMoney(n)
})

const replBalanceShotUrl = computed(() => {
  const u = pickReplen('balanceScreenshotUrl')
  return u ? String(u) : ''
})

const replTransferShotUrl = computed(() => {
  const u = pickReplen('transferScreenshotUrl')
  return u ? String(u) : ''
})

// const remainingToRepayText = computed(() => {
//   const d = props.detail
//   if (!d) return '—'
//   const app = replenishmentApply.value
//   const replenish = Number(app?.replenishAmount)
//   const repay = Number(d.repayAmount)
//   const a = Number.isFinite(replenish) ? replenish : 0
//   const b = Number.isFinite(repay) ? repay : 0
//   return formatMoney(a - b)
// })

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
