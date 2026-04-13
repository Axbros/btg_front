<template>
  <div>
    <AppHeader title="分润汇总" />
    <van-loading v-if="loading" class="account__loading" vertical>加载中…</van-loading>
    <div v-else class="account">
      <template v-if="summary">
        <div class="account__grid">
          <SummaryCard label="累计盈利" :value="formatMoney(summary.totalProfitAmount)" />
          <SummaryCard label="累计分出分润" :value="formatMoney(summary.totalCommissionOutAmount)" />
          <SummaryCard label="累计收到分润" :value="formatMoney(summary.totalCommissionInAmount)" />
          <SummaryCard label="待审核分出分润" :value="formatMoney(summary.pendingCommissionOutAmount)" />
          <SummaryCard label="待审核应收分润" :value="formatMoney(summary.pendingCommissionInAmount)" />
        </div>
      </template>
      <EmptyState v-else description="暂无汇总数据" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchAccountSummary } from '@/api/user'
import { formatMoney } from '@/utils/format'
import AppHeader from '@/components/AppHeader.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const summary = ref(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const sum = await fetchAccountSummary().catch(() => null)
    summary.value = sum != null && typeof sum === 'object' ? sum : null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.account {
  padding: 12px;
  padding-top: 8px;
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
