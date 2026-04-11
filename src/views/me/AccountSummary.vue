<template>
  <div>
    <AppHeader title="账户汇总" />
    <div v-if="summary" class="account">
      <div class="account__grid">
        <SummaryCard label="累计盈利" :value="formatMoney(summary.totalProfitAmount)" />
        <SummaryCard label="累计分出佣金" :value="formatMoney(summary.totalCommissionOutAmount)" />
        <SummaryCard label="累计收到佣金" :value="formatMoney(summary.totalCommissionInAmount)" />
        <SummaryCard label="待审核分出佣金" :value="formatMoney(summary.pendingCommissionOutAmount)" />
        <SummaryCard label="待审核应收佣金" :value="formatMoney(summary.pendingCommissionInAmount)" />
      </div>
    </div>
    <van-loading v-else-if="loading" class="account__loading" vertical>加载中…</van-loading>
    <EmptyState v-else description="暂无汇总数据" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { formatMoney } from '@/utils/format'
import AppHeader from '@/components/AppHeader.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchAccountSummary } from '@/api/user'

const summary = ref(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    summary.value = await fetchAccountSummary()
  } catch {
    summary.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.account {
  padding: 12px;
}
.account__grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.account__loading {
  padding: 48px 0;
}
</style>
