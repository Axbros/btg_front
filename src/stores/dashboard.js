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
  /** 待支付给团队长（本人应付给团队长的结算单） */
  const pendingSettlementPayableCount = num(d.pendingSettlementPayableCount)
  const pendingProfitReportReviewCount = num(d.pendingProfitReportReviewCount)
  const pendingReplenishmentReviewCount = num(d.pendingReplenishmentReviewCount)
  const pendingReplenishmentApplicantConfirmCount = num(d.pendingReplenishmentApplicantConfirmCount)
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
    pendingReplenishmentApplicantConfirmCount +
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
    pendingReplenishmentApplicantConfirmCount,
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
  pendingReplenishmentApplicantConfirmCount: 0,
  pendingReplenishmentRepayReviewCount: 0,
  returnedProfitReportCount: 0,
  returnedReplenishmentApplyCount: 0,
  returnedReplenishmentRepayCount: 0,
  totalPendingCount: 0,
})

/** 与后端待办角标同步；静默轮询不驱动 loading，避免界面闪烁 */
const PENDING_SUMMARY_POLL_MS = 5000

export const useDashboardStore = defineStore('dashboard', () => {
  const pendingSummary = ref(emptySummary())
  const todoItems = ref([])
  const loading = ref(false)
  const todoLoading = ref(false)
  let fetchFailedToastShown = false
  let todoFetchFailedToastShown = false
  /** @type {ReturnType<typeof setInterval> | null} */
  let pendingSummaryPollTimer = null

  const totalPendingCount = computed(() => num(pendingSummary.value.totalPendingCount))

  function stopPendingSummaryPolling() {
    if (pendingSummaryPollTimer != null) {
      clearInterval(pendingSummaryPollTimer)
      pendingSummaryPollTimer = null
    }
  }

  function startPendingSummaryPolling() {
    stopPendingSummaryPolling()
    pendingSummaryPollTimer = setInterval(() => {
      void fetchPendingSummary({ silent: true })
    }, PENDING_SUMMARY_POLL_MS)
  }

  function clearPendingSummary() {
    stopPendingSummaryPolling()
    pendingSummary.value = emptySummary()
    todoItems.value = []
    loading.value = false
    todoLoading.value = false
    fetchFailedToastShown = false
    todoFetchFailedToastShown = false
  }

  /**
   * @param {{ silent?: boolean }} [options] silent=true：后台轮询，不修改 loading、失败 Toast 仍受 fetchFailedToastShown 限制
   */
  async function fetchPendingSummary(options = {}) {
    const silent = Boolean(options?.silent)
    if (!silent) loading.value = true
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
      if (!silent) loading.value = false
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
    startPendingSummaryPolling,
    stopPendingSummaryPolling,
  }
})
