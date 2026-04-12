<template>
  <div>
    <AppHeader title="归仓" />
    <div v-if="current" class="hub-banner">
      <van-tag :type="replenishmentStatusTagType(current.status)" plain round class="hub-banner__tag">
        {{ formatReplenishmentStatus(current.status) }}
      </van-tag>
      <p class="hub-banner__text">{{ hubBannerRest }}</p>
    </div>
    <van-cell-group v-if="current" inset title="当前未结清补仓" class="hub-current">
      <van-cell title="剩余待归还" :value="formatMoney(current.remainingAmount ?? current.remaining_amount ?? 0)" />
      <van-cell title="资方转账凭证">
        <a v-if="transferProofUrl" :href="transferProofUrl" target="_blank" rel="noopener">查看资方凭证</a>
        <span v-else>—</span>
      </van-cell>
      <van-cell
        v-if="transferRemarkText"
        title="资方转账备注"
        :value="transferRemarkText"
      />
    </van-cell-group>
    <van-notice-bar
      v-else
      left-icon="info-o"
      color="#646566"
      background="#f7f8fa"
      :scrollable="false"
      wrapable
      text="暂无进行中的补仓单时仍可查看归仓记录；提交归仓需先有审核通过的补仓。"
    />
    <van-cell-group inset title="归仓" class="repay-hub__actions">
      <van-cell title="提交归仓申请" is-link to="/replenishment/repay-submit" />
      <van-cell title="我的归仓记录" is-link to="/replenishment/repay-mine" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
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
.repay-hub__actions {
  margin-top: 12px;
}
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
