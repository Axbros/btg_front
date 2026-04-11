<template>
  <van-cell-group inset class="profit-card">
    <van-cell :title="orderNo" :value="statusText">
      <template #title>
        <span class="profit-card__title">{{ orderNo }}</span>
      </template>
    </van-cell>
    <van-cell title="总利润" :value="formatMoney(item.profitAmount)" />
    <!-- <van-cell title="子级利润比例" :value="formatRate(ratioField)" /> -->
    <!-- <van-cell title="自留分润" :value="formatMoney(netField)" /> -->
    <!-- <van-cell title="链路上级计提" :value="formatMoney(shareUpField)" /> -->
    <van-cell title="提交时间" :value="formatDateTime(item.submitTime)" />
    <van-cell v-if="item.auditTime" title="审核时间" :value="formatDateTime(item.auditTime)" />
    <van-cell v-if="item.auditRemark" title="审核备注" :label="item.auditRemark" />
    <van-cell
      v-if="showDistributionLink && item.id != null && isRootUser"
      title="分润明细"
      is-link
      @click.stop="goDistribution"
    />
  </van-cell-group>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, formatDateTime, formatRate, formatProfitRecordStatus } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true },
  showDistributionLink: { type: Boolean, default: false },
})

const router = useRouter()
const { userInfo } = storeToRefs(useAuthStore())

/** 仅根用户可查看整条链路分润明细（与后端 isRoot 一致） */
const isRootUser = computed(() => {
  const u = userInfo.value
  if (!u) return false
  const v = u.isRoot ?? u.is_root
  if (v === true || v === 1 || v === '1') return true
  if (v === false || v === 0 || v === '0') return false
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true
  return false
})

const orderNo = computed(() => props.item.reportNo )

const statusText = computed(() => formatProfitRecordStatus(props.item.status))

const ratioField = computed(
  () => props.item.childProfitRatio ?? props.item.child_profit_ratio ?? props.item.commissionRate ?? props.item.rate,
)

const netField = computed(
  () => props.item.netAmount ?? props.item.netProfit ?? props.item.retainedAmount ?? props.item.selfAmount,
)

const shareUpField = computed(
  () =>
    props.item.commissionAmount ??
    props.item.shouldAmount ??
    props.item.upstreamShareAmount ??
    props.item.payableToSuperiorAmount,
)

function goDistribution() {
  const id = props.item.id
  if (id == null) return
  router.push({
    name: 'ProfitDistributionDetail',
    params: { profitReportId: String(id) },
  })
}
</script>

<style scoped>
.profit-card {
  margin-bottom: 10px;
}
.profit-card__title {
  font-weight: 600;
}
</style>
