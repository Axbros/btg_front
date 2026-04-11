<template>
  <div>
    <AppHeader title="补仓与归仓" />
    <van-notice-bar v-if="noticeText" left-icon="info-o" :scrollable="false" :text="noticeText" />
    <van-cell-group inset title="补仓">
      <van-cell title="提交补仓申请" is-link to="/replenishment/submit" />
      <van-cell title="我的补仓记录" is-link to="/replenishment/mine" />
    </van-cell-group>
    <van-cell-group inset title="归仓" style="margin-top: 12px;">
      <van-cell title="提交归仓申请" is-link to="/replenishment/repay-submit" />
      <van-cell title="我的归仓记录" is-link to="/replenishment/repay-mine" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { fetchReplenishmentCurrent } from '@/api/replenishment'
import { formatMoney, formatReplenishmentStatus } from '@/utils/format'

const current = ref(null)

const noticeText = computed(() => {
  const c = current.value
  if (!c) return ''
  const st = c.status
  const label = formatReplenishmentStatus(st)
  const rem = formatMoney(c.remainingAmount ?? c.remaining_amount ?? 0)
  return `当前补仓单：${label}；剩余待归还 ${rem} 元（含待审核归仓请留意额度）。`
})

onMounted(async () => {
  try {
    current.value = await fetchReplenishmentCurrent()
  } catch {
    current.value = null
  }
})
</script>
