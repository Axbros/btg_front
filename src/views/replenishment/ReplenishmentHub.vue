<template>
  <div>
    <AppHeader title="补仓" />
    <div v-if="current" class="hub-banner">
      <van-tag :type="replenishmentStatusTagType(current.status)" plain round class="hub-banner__tag">
        {{ formatReplenishmentStatus(current.status) }}
      </van-tag>
      <p class="hub-banner__text">{{ hubBannerRest }}</p>
    </div>
    <van-cell-group v-if="current" inset title="当前未结清补仓" class="hub-current">
      <van-cell title="剩余待归还" :value="formatMoney(current.remainingAmount ?? current.remaining_amount ?? 0)" />
      <van-cell title="资方转账凭证">
        <template #value>
          <PreviewableRemoteImage v-if="transferProofUrl" :url="transferProofUrl" alt="资方转账凭证" />
          <span v-else>—</span>
        </template>
      </van-cell>
      <van-cell
        v-if="transferRemarkText"
        title="资方转账备注"
        :value="transferRemarkText"
      />
    </van-cell-group>
    <van-cell-group inset title="补仓">
      <van-cell title="提交补仓申请" is-link to="/replenishment/submit" />
      <van-cell title="我的补仓记录" is-link to="/replenishment/mine" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import { fetchReplenishmentCurrent } from '@/api/replenishment'
import {
  formatMoney,
  formatReplenishmentStatus,
  replenishmentStatusTagType,
} from '@/utils/format'

const current = ref(null)

const transferProofUrl = computed(() => {
  const c = current.value
  if (!c) return ''
  const u = c.transferScreenshotUrl ?? c.transfer_screenshot_url
  return u && String(u).trim() ? String(u).trim() : ''
})

const transferRemarkText = computed(() => {
  const c = current.value
  if (!c) return ''
  const t = c.transferRemark ?? c.transfer_remark
  return t != null && String(t).trim() !== '' ? String(t).trim() : ''
})

const hubBannerRest = computed(() => {
  const c = current.value
  if (!c) return ''
  const rem = formatMoney(c.remainingAmount ?? c.remaining_amount ?? 0)
  return `当前补仓单；剩余待归还 ${rem} 元（含待审核归仓请留意额度）。`
})

onMounted(async () => {
  try {
    current.value = await fetchReplenishmentCurrent()
  } catch {
    current.value = null
  }
})
</script>

<style scoped>
.hub-current {
  margin-bottom: 12px;
}
.hub-banner {
  margin: 10px 16px 0;
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.hub-banner__tag {
  flex-shrink: 0;
  margin-top: 2px;
}
.hub-banner__text {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #646566;
}
</style>
