import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { getPendingSummary } from '@/api/dashboard'

function num(v) {
  const x = Number(v)
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0
}

/** 接口 data 兜底，缺字段不抛错 */
export function normalizePendingSummary(raw) {
  const d = raw != null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const pendingSettlementReviewCount = num(d.pendingSettlementReviewCount)
  const pendingProfitReportReviewCount = num(d.pendingProfitReportReviewCount)
  const pendingReplenishmentReviewCount = num(d.pendingReplenishmentReviewCount)
  const pendingReplenishmentRepayReviewCount = num(d.pendingReplenishmentRepayReviewCount)
  let totalPendingCount = num(d.totalPendingCount)
  const sum =
    pendingSettlementReviewCount +
    pendingProfitReportReviewCount +
    pendingReplenishmentReviewCount +
    pendingReplenishmentRepayReviewCount
  if (totalPendingCount === 0 && sum > 0) {
    totalPendingCount = sum
  }
  const hasPending = Boolean(d.hasPending) || totalPendingCount > 0
  return {
    hasPending,
    pendingSettlementReviewCount,
    pendingProfitReportReviewCount,
    pendingReplenishmentReviewCount,
    pendingReplenishmentRepayReviewCount,
    totalPendingCount,
  }
}

const emptySummary = () => ({
  hasPending: false,
  pendingSettlementReviewCount: 0,
  pendingProfitReportReviewCount: 0,
  pendingReplenishmentReviewCount: 0,
  pendingReplenishmentRepayReviewCount: 0,
  totalPendingCount: 0,
})

export const useDashboardStore = defineStore('dashboard', () => {
  const pendingSummary = ref(emptySummary())
  const loading = ref(false)
  let fetchFailedToastShown = false

  const totalPendingCount = computed(() => num(pendingSummary.value.totalPendingCount))

  function clearPendingSummary() {
    pendingSummary.value = emptySummary()
    loading.value = false
    fetchFailedToastShown = false
  }

  async function fetchPendingSummary() {
    loading.value = true
    try {
      const data = await getPendingSummary()
      pendingSummary.value = normalizePendingSummary(data)
      fetchFailedToastShown = false
    } catch (e) {
      console.warn('[dashboard] pending-summary failed', e)
      pendingSummary.value = emptySummary()
      if (!fetchFailedToastShown) {
        fetchFailedToastShown = true
        showToast({ type: 'text', message: '待办汇总加载失败', duration: 2000 })
      }
    } finally {
      loading.value = false
    }
  }

  return {
    pendingSummary,
    loading,
    totalPendingCount,
    fetchPendingSummary,
    clearPendingSummary,
    normalizePendingSummary,
  }
})
