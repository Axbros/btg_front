import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { getPendingSummary /* , getTodoItems */ } from '@/api/dashboard'
// import { normalizeTodoItemsResponse } from '@/utils/dashboardTodo'

function num(v) {
  const x = Number(v)
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0
}

/** 接口 data 兜底，缺字段不抛错 */
export function normalizePendingSummary(raw) {
  const d = raw != null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const pendingSettlementReviewCount = num(d.pendingSettlementReviewCount)
  /** 待支付给上级（本人应付给上级的结算单） */
  const pendingSettlementPayableCount = num(d.pendingSettlementPayableCount)
  const pendingProfitReportReviewCount = num(d.pendingProfitReportReviewCount)
  const pendingReplenishmentReviewCount = num(d.pendingReplenishmentReviewCount)
  const pendingReplenishmentRepayReviewCount = num(d.pendingReplenishmentRepayReviewCount)
  const returnedProfitReportCount = num(d.returnedProfitReportCount)
  const returnedReplenishmentApplyCount = num(d.returnedReplenishmentApplyCount)
  const returnedReplenishmentRepayCount = num(d.returnedReplenishmentRepayCount)
  let totalPendingCount = num(d.totalPendingCount)
  const sum =
    pendingSettlementReviewCount +
    pendingSettlementPayableCount +
    pendingProfitReportReviewCount +
    pendingReplenishmentReviewCount +
    pendingReplenishmentRepayReviewCount +
    returnedProfitReportCount +
    returnedReplenishmentApplyCount +
    returnedReplenishmentRepayCount
  if (totalPendingCount === 0 && sum > 0) {
    totalPendingCount = sum
  }
  const hasPending = Boolean(d.hasPending) || totalPendingCount > 0
  return {
    hasPending,
    pendingSettlementReviewCount,
    pendingSettlementPayableCount,
    pendingProfitReportReviewCount,
    pendingReplenishmentReviewCount,
    pendingReplenishmentRepayReviewCount,
    returnedProfitReportCount,
    returnedReplenishmentApplyCount,
    returnedReplenishmentRepayCount,
    totalPendingCount,
  }
}

const emptySummary = () => ({
  hasPending: false,
  pendingSettlementReviewCount: 0,
  pendingSettlementPayableCount: 0,
  pendingProfitReportReviewCount: 0,
  pendingReplenishmentReviewCount: 0,
  pendingReplenishmentRepayReviewCount: 0,
  returnedProfitReportCount: 0,
  returnedReplenishmentApplyCount: 0,
  returnedReplenishmentRepayCount: 0,
  totalPendingCount: 0,
})

export const useDashboardStore = defineStore('dashboard', () => {
  const pendingSummary = ref(emptySummary())
  const todoItems = ref([])
  const loading = ref(false)
  const todoLoading = ref(false)
  let fetchFailedToastShown = false
  let todoFetchFailedToastShown = false

  const totalPendingCount = computed(() => num(pendingSummary.value.totalPendingCount))

  function clearPendingSummary() {
    pendingSummary.value = emptySummary()
    todoItems.value = []
    loading.value = false
    todoLoading.value = false
    fetchFailedToastShown = false
    todoFetchFailedToastShown = false
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

  /** 已停用：不再请求 GET /dashboard/todo-items（恢复时取消注释并补回 import） */
  async function fetchTodoItems(_params = {}) {
    return
    /*
    todoLoading.value = true
    try {
      const raw = await getTodoItems(params)
      todoItems.value = normalizeTodoItemsResponse(raw)
      todoFetchFailedToastShown = false
    } catch (e) {
      console.warn('[dashboard] todo-items failed', e)
      todoItems.value = []
      if (!todoFetchFailedToastShown) {
        todoFetchFailedToastShown = true
        showToast({ type: 'text', message: '待办列表加载失败', duration: 2000 })
      }
    } finally {
      todoLoading.value = false
    }
    */
  }

  return {
    pendingSummary,
    todoItems,
    loading,
    todoLoading,
    totalPendingCount,
    fetchPendingSummary,
    fetchTodoItems,
    clearPendingSummary,
    normalizePendingSummary,
  }
})
