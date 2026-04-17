<template>
  <van-cell-group v-if="detail">
    <van-cell title="申请单号" :value="txt(pick('applyNo'))" />
    <van-cell title="补仓状态">
      <template #value>
        <van-tag :type="replenishmentStatusTagType(pick('status'))" plain round>
          {{ formatReplenishmentStatus(pick('status')) }}
        </van-tag>
      </template>
    </van-cell>
    <van-cell title="底仓本金" :value="formatMoney(pick('principalAmount'))" />
    <van-cell title="申报余额" :value="formatMoney(pick('balanceAmount'))" />
    <van-cell title="补仓额度" :value="formatMoney(pick('replenishAmount'))" />
    <!-- <van-cell title="已通过额度" :value="formatMoney(pick('approvedAmount'))" /> -->
    <van-cell title="归仓额度" :value="formatMoney(pick('repaidAmount'))" />
    <van-cell title="待审归仓" :value="formatMoney(pick('pendingRepayAmount'))" />
    <van-cell title="剩余待归" :value="formatMoney(pick('remainingAmount'))" />
    <van-cell title="余额截图">
      <template #value>
        <PreviewableRemoteImage v-if="balanceShotUrl" :url="balanceShotUrl" alt="余额截图" size="large" />
        <span v-else>—</span>
      </template>
    </van-cell>
    <template v-if="hasWalletInfo">
      <van-cell title="交易所名称" :value="walletNameDisplay" />
      <van-cell title="钱包地址" :value="walletAddressDisplay" />
    </template>
    <van-cell v-if="txt(pick('acceptedBy')) !== '—'" title="受理人" :value="txt(pick('acceptedBy'))" />
    <van-cell
      v-if="txt(pick('acceptedAt')) !== '—'"
      title="受理时间"
      :value="formatDateTime(pick('acceptedAt'))"
    />
    <van-cell v-if="transferShotUrl" title="资方凭证">
      <template #value>
        <PreviewableRemoteImage :url="transferShotUrl" alt="资方凭证" size="large" />
      </template>
    </van-cell>
    <van-cell
      v-if="txt(pick('transferRemark')) !== '—'"
      title="资方备注"
      :value="txt(pick('transferRemark'))"
    />
    <van-cell title="提交时间" :value="formatDateTime(pick('submitTime'))" />
    <van-cell v-if="txt(pick('auditTime')) !== '—'" title="审核时间" :value="formatDateTime(pick('auditTime'))" />
    <!-- <van-cell v-if="txt(pick('auditBy')) !== '—'" title="审核人 ID" :value="txt(pick('auditBy'))" /> -->
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

function pick(key) {
  const o = props.detail
  if (!o || typeof o !== 'object') return null
  return o[key] ?? null
}

function txt(v) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s !== '' ? s : '—'
}

const balanceShotUrl = computed(() => {
  const u = pick('balanceScreenshotUrl')
  return u ? String(u) : ''
})

const transferShotUrl = computed(() => {
  const u = pick('transferScreenshotUrl')
  return u ? String(u) : ''
})

const walletNameDisplay = computed(() => txt(pick('walletName')))

const walletAddressDisplay = computed(() => txt(pick('walletAddress')))

const hasWalletInfo = computed(
  () => walletNameDisplay.value !== '—' || walletAddressDisplay.value !== '—',
)
</script>
