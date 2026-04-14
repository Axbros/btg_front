<template>
  <div class="todo-hub">
    <AppHeader title="待办" :show-back="false" />

    <van-cell-group inset title="快捷入口" class="todo-hub__block">
      <van-cell
        v-if="!isRootUser"
        title="待支付给上级"
        is-link
        @click="goNav('/settlement/pending-pay')"
      >
        <template #value>
          <van-badge v-if="payableBadge" :content="payableBadge" max="99" />
        </template>
      </van-cell>
      <van-cell title="待审核下级结算" is-link @click="goNav('/settlement/pending-review')">
        <template #value>
          <van-badge v-if="settlementBadge" :content="settlementBadge" max="99" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="待办汇总" class="todo-hub__block">
      <van-cell title="总待办" center>
        <template #value>
          <span :class="metricNumClass(totalAllPending)">{{ totalAllPending }}</span>
        </template>
      </van-cell>
      <van-cell title="待审核下级结算" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.pendingSettlementReviewCount)">
            {{ num0(pendingSummary?.pendingSettlementReviewCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell title="待支付给上级" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.pendingSettlementPayableCount)">
            {{ num0(pendingSummary?.pendingSettlementPayableCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="待审核利润上报" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.pendingProfitReportReviewCount)">
            {{ num0(pendingSummary?.pendingProfitReportReviewCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="待审核补仓" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.pendingReplenishmentReviewCount)">
            {{ num0(pendingSummary?.pendingReplenishmentReviewCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="待审核归仓" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.pendingReplenishmentRepayReviewCount)">
            {{ num0(pendingSummary?.pendingReplenishmentRepayReviewCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="退回待修改·利润" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.returnedProfitReportCount)">
            {{ num0(pendingSummary?.returnedProfitReportCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="退回待修改·补仓" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.returnedReplenishmentApplyCount)">
            {{ num0(pendingSummary?.returnedReplenishmentApplyCount) }}
          </span>
        </template>
      </van-cell>
      <van-cell v-if="!isRootUser" title="退回待修改·归仓" center>
        <template #value>
          <span :class="metricNumClass(pendingSummary?.returnedReplenishmentRepayCount)">
            {{ num0(pendingSummary?.returnedReplenishmentRepayCount) }}
          </span>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="待办事项" class="todo-hub__block">
      <van-loading v-if="todoLoading" class="todo-hub__loading" vertical>加载待办…</van-loading>
      <template v-else-if="todoItems.length">
        <van-cell
          v-for="(row, idx) in todoItems"
          :key="`${row.todoType || 'x'}-${row.businessId ?? idx}`"
          is-link
          @click="onTodoRowClick(row)"
        >
          <template #title>
            <div class="todo-hub__todo-title">{{ row.title || '待办' }}</div>
            <div class="todo-hub__todo-meta">
              <van-tag plain type="primary" class="todo-hub__todo-tag">{{ formatDashboardTodoType(row.todoType) }}</van-tag>
              <span class="todo-hub__todo-status">{{ formatTodoItemCurrentStatus(row) }}</span>
            </div>
          </template>
          <template #label>
            <div v-if="row.latestOperateTime" class="todo-hub__todo-time">{{ formatDateTime(row.latestOperateTime) }}</div>
            <div v-if="rejectReasonText(row)" class="todo-hub__todo-reason">{{ rejectReasonText(row) }}</div>
            <div v-if="actionHintText(row)" class="todo-hub__todo-hint">{{ actionHintText(row) }}</div>
          </template>
        </van-cell>
      </template>
      <van-empty v-else image="search" description="暂无待办事项" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { isUserRoot } from '@/utils/permission'
import { formatDateTime } from '@/utils/format'
import {
  formatDashboardTodoType,
  formatTodoItemCurrentStatus,
  resolveTodoNavigation,
} from '@/utils/dashboardTodo'
import AppHeader from '@/components/AppHeader.vue'

const router = useRouter()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const { userInfo } = storeToRefs(auth)
const { pendingSummary, todoItems, todoLoading } = storeToRefs(dashboard)

const isRootUser = computed(() => isUserRoot(userInfo.value))

function countBadge(n) {
  const v = Number(n) || 0
  return v > 0 ? (v > 99 ? '99+' : v) : undefined
}

const settlementBadge = computed(() => countBadge(pendingSummary.value?.pendingSettlementReviewCount))
const payableBadge = computed(() => countBadge(pendingSummary.value?.pendingSettlementPayableCount))

function num0(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function metricNumClass(n) {
  return num0(n) > 0 ? 'todo-hub__metric-num todo-hub__metric-num--hot' : 'todo-hub__metric-num'
}

const totalAllPending = computed(() => num0(pendingSummary.value?.totalPendingCount))

function rejectReasonText(row) {
  const s = row?.lastRejectReason
  if (s == null || String(s).trim() === '') return ''
  return `拒绝说明：${String(s).trim()}`
}

function actionHintText(row) {
  const s = row?.actionHint
  if (s == null || String(s).trim() === '') return ''
  return String(s).trim()
}

function goNav(to) {
  if (auth.isRestrictedToProfileComplete) {
    showToast('请先完成资料流程')
    router.replace('/me/profile-complete')
    return
  }
  router.push(to)
}

function onTodoRowClick(row) {
  const nav = resolveTodoNavigation(row)
  if (!nav) {
    showToast('暂无法跳转')
    return
  }
  if (nav.external && nav.url) {
    window.location.href = nav.url
    return
  }
  if (nav.path) goNav(nav.path)
}

onMounted(() => {
  if (!auth.isLogin) return
  void dashboard.fetchPendingSummary().catch(() => {})
  void dashboard.fetchTodoItems({ page: 1, size: 30 }).catch(() => {})
})
</script>

<style scoped>
.todo-hub {
  padding: 0 0 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}
.todo-hub__block {
  margin-top: 12px;
}
.todo-hub__metric-num {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}
.todo-hub__metric-num--hot {
  color: #ee0a24;
}
.todo-hub__loading {
  padding: 24px 0;
  display: flex;
  justify-content: center;
}
.todo-hub__todo-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  line-height: 1.4;
}
.todo-hub__todo-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.todo-hub__todo-tag {
  flex-shrink: 0;
}
.todo-hub__todo-status {
  font-size: 13px;
  color: #646566;
}
.todo-hub__todo-time {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}
.todo-hub__todo-reason {
  margin-top: 6px;
  font-size: 12px;
  color: #ee0a24;
  line-height: 1.45;
}
.todo-hub__todo-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #576b95;
  line-height: 1.45;
}
</style>
