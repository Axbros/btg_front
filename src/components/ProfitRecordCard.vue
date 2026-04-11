<template>
  <van-cell-group inset class="profit-card">
    <van-cell :title="`单号 ${orderNo}`" :value="statusText">
      <template #title>
        <span class="profit-card__title">{{ orderNo }}</span>
      </template>
    </van-cell>
    <van-cell title="盈利金额" :value="formatMoney(item.profitAmount ?? item.amount)" />
    <van-cell title="分佣比例" :value="formatRate(item.commissionRate ?? item.rate)" />
    <van-cell title="应分佣金额" :value="formatMoney(item.commissionAmount ?? item.shouldAmount)" />
    <van-cell title="净金额" :value="formatMoney(item.netAmount ?? item.netProfit)" />
    <van-cell title="提交时间" :value="formatDateTime(item.submitTime)" />
    <van-cell v-if="item.auditTime" title="审核时间" :value="formatDateTime(item.auditTime)" />
    <van-cell v-if="item.auditRemark" title="审核备注" :label="item.auditRemark" />
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney, formatDateTime, formatRate, formatProfitRecordStatus } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true },
})

const orderNo = computed(() => props.item.recordNo ?? props.item.id ?? '—')

const statusText = computed(() => formatProfitRecordStatus(props.item.status))
</script>

<style scoped>
.profit-card {
  margin-bottom: 10px;
}
.profit-card__title {
  font-weight: 600;
}
</style>
