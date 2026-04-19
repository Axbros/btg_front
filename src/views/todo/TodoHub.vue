<template>
  <div class="todo-hub todo-hub--brand page-with-brand-header">
    <div class="todo-hub-bg-layer" aria-hidden="true" />

    <AppHeader title="待办" :show-back="false" />

    <div class="todo-hub__main">
      <section class="todo-hub-stats" aria-label="待办汇总">
        <van-row v-for="(cols, ri) in summaryStatRows" :key="ri" :gutter="10">
          <van-col v-for="cell in cols" :key="cell.label" span="12">
            <div class="todo-hub-stats__card">
              <div class="todo-hub-stats__label">{{ cell.label }}</div>
              <div
                class="todo-hub-stats__value"
                :class="{ 'todo-hub-stats__value--hot': cell.hot }"
              >
                {{ cell.value }}
              </div>
            </div>
          </van-col>
        </van-row>
      </section>

      <div class="section-title-row todo-hub__section-head ">
        <h2 class="section-title">对上级待办</h2>
        <!-- <span class="section-subtitle">高频审批</span> -->
      </div>

      <van-cell-group inset class="todo-hub__block todo-quick van-cell-group--card-style">
        <van-cell
          v-if="!isRootUser"
          title="待支付上级结算"
          is-link
          @click="goNav('/settlement/pending-pay')"
        >
          <template #value>
            <van-badge v-if="payableBadge" :content="payableBadge" max="99" />
          </template>
        </van-cell>

         <van-cell
          v-if="!isRootUser"
          title="待确认补仓"
          is-link
          @click="goNav('/settlement/pending-pay')"
        >
          <template #value>
            <van-badge
              v-if="replenishmentApplicantConfirmBadge"
              :content="replenishmentApplicantConfirmBadge"
              max="99"
            />
          </template>
        </van-cell>
       
      </van-cell-group>

      <div class="section-title-row todo-hub__section-head">
        <h2 class="section-title">对下级待办</h2>
        <!-- <span class="section-subtitle">高频审批</span> -->
      </div>
      <van-cell-group  inset class="todo-hub__block todo-quick van-cell-group--card-style">
        <van-cell
          v-if="isRootUser"
          title="待审核资格"
          is-link
          @click="goNav({ name: 'AdminUserQualificationPending' })"
        />
         <van-cell title="待审核下级结算" is-link @click="goNav('/settlement/pending-review')">
          <template #value>
            <van-badge v-if="settlementBadge" :content="settlementBadge" max="99" />
          </template>
        </van-cell>
    
        <van-cell
          v-if="!isRootUser"
          title="待确认归仓"
          is-link
          @click="goNav({ name: 'RepayPendingReview' })"
        />
      </van-cell-group>

      <!-- <div class="section-title-row todo-hub__section-head">
        <h2 class="section-title">待办列表</h2>
        <span class="section-subtitle">需处理 / 仅查看</span>
      </div>

      <div class="todo-hub__block todo-hub__list-scope">
        <van-loading v-if="todoLoading" class="todo-hub__loading" vertical>加载待办…</van-loading>
        <template v-else-if="todoItems.length">
          <van-cell-group
            v-if="actionableTodoItems.length"
            inset
            title="待办事项（需处理）"
            class="todo-hub__block todo-action van-cell-group--card-style"
          >
            <van-cell
              v-for="(row, idx) in actionableTodoItems"
              :key="`a-${row.todoType || 'x'}-${row.businessId ?? idx}`"
              is-link
              @click="onTodoRowClick(row)"
            >
              <template #title>
                <div class="todo-hub__todo-title">{{ row.title || '待办' }}</div>
                <div class="todo-hub__todo-meta">
                  <van-tag plain type="primary" round class="todo-hub__todo-tag">
                    {{ formatDashboardTodoType(row.todoType) }}
                  </van-tag>
                  <span class="todo-hub__todo-status">{{ formatTodoItemCurrentStatus(row) }}</span>
                </div>
              </template>
              <template #label>
                <div v-if="row.latestOperateTime" class="todo-hub__todo-time">{{ formatDateTime(row.latestOperateTime) }}</div>
                <div v-if="rejectReasonText(row)" class="todo-hub__todo-reason">{{ rejectReasonText(row) }}</div>
                <div v-if="actionHintText(row)" class="todo-hub__todo-hint">{{ actionHintText(row) }}</div>
              </template>
            </van-cell>
          </van-cell-group>
          <van-cell-group
            v-if="readonlyTodoItems.length"
            inset
            title="仅查看（链路 / 归仓关注）"
            class="todo-hub__block todo-readonly van-cell-group--card-style"
          >
            <van-cell
              v-for="(row, idx) in readonlyTodoItems"
              :key="`r-${row.todoType || 'x'}-${row.businessId ?? idx}`"
              :is-link="false"
            >
              <template #title>
                <div class="todo-hub__todo-title">{{ row.title || '仅查看待办' }}</div>
                <div class="todo-hub__todo-meta">
                  <van-tag plain type="success" round class="todo-hub__todo-tag">
                    {{ formatDashboardTodoType(row.todoType) }}
                  </van-tag>
                  <span class="todo-hub__todo-status">{{ formatTodoItemCurrentStatus(row) }}</span>
                </div>
              </template>
              <template #label>
                <div v-if="row.latestOperateTime" class="todo-hub__todo-time">{{ formatDateTime(row.latestOperateTime) }}</div>
                <div class="todo-hub__todo-actions">
                  <van-button size="small" plain type="primary" round @click.stop="onViewReadonlyTodo(row)">
                    {{ readonlyTodoActionLabel(row) }}
                  </van-button>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </template>
        <div v-else class="todo-hub__empty app-glass-card">
          <van-empty image="search" description="暂无待办事项" />
        </div>
      </div> -->
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { isUserRoot } from '@/utils/permission'
// import { formatDateTime } from '@/utils/format'
// import {
//   formatDashboardTodoType,
//   formatTodoItemCurrentStatus,
//   resolveTodoNavigation,
//   isDashboardTodoReadOnly,
// } from '@/utils/dashboardTodo'
import AppHeader from '@/components/AppHeader.vue'

const router = useRouter()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const { userInfo } = storeToRefs(auth)
const { pendingSummary /* , todoItems, todoLoading */ } = storeToRefs(dashboard)

// const actionableTodoItems = computed(() => todoItems.value.filter((r) => !isDashboardTodoReadOnly(r)))
// const readonlyTodoItems = computed(() => todoItems.value.filter((r) => isDashboardTodoReadOnly(r)))

const isRootUser = computed(() => isUserRoot(userInfo.value))

function countBadge(n) {
  const v = Number(n) || 0
  return v > 0 ? (v > 99 ? '99+' : v) : undefined
}

const settlementBadge = computed(() => countBadge(pendingSummary.value?.pendingSettlementReviewCount))
const payableBadge = computed(() => countBadge(pendingSummary.value?.pendingSettlementPayableCount))
const replenishmentApplicantConfirmBadge = computed(() =>
  countBadge(pendingSummary.value?.pendingReplenishmentApplicantConfirmCount),
)

function num0(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function summaryTile(label, raw) {
  const value = num0(raw)
  return { label, value, hot: value > 0 }
}

const summaryStatTiles = computed(() => {
  const ps = pendingSummary.value
  const tiles = [
    summaryTile('总待办', ps?.totalPendingCount),
    // summaryTile('待审核下级结算', ps?.pendingSettlementReviewCount),
    // summaryTile('待支付给上级', ps?.pendingSettlementPayableCount),
  ]
  if (!isRootUser.value) {
    tiles.push(
      // summaryTile('待审核利润上报', ps?.pendingProfitReportReviewCount),
      // summaryTile('待审核补仓', ps?.pendingReplenishmentReviewCount),
      // summaryTile('待审核归仓', ps?.pendingReplenishmentRepayReviewCount),
      summaryTile('退回待修改·利润', ps?.returnedProfitReportCount),
      summaryTile('退回待修改·补仓', ps?.returnedReplenishmentApplyCount),
      summaryTile('退回待修改·归仓', ps?.returnedReplenishmentRepayCount),
    )
  }
  return tiles
})

const summaryStatRows = computed(() => {
  const tiles = summaryStatTiles.value
  const rows = []
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2))
  }
  return rows
})

// function rejectReasonText(row) {
//   const s = row?.lastRejectReason
//   if (s == null || String(s).trim() === '') return ''
//   return `拒绝说明：${String(s).trim()}`
// }

// function actionHintText(row) {
//   const s = row?.actionHint
//   if (s == null || String(s).trim() === '') return ''
//   return String(s).trim()
// }

function goNav(to) {
  if (auth.isRestrictedToProfileComplete) {
    showToast('请先完成资料流程')
    router.replace('/me/profile-complete')
    return
  }
  router.push(to)
}

// function onTodoRowClick(row) {
//   const nav = resolveTodoNavigation(row)
//   if (!nav) {
//     showToast('暂无法跳转')
//     return
//   }
//   if (nav.external && nav.url) {
//     window.location.href = nav.url
//     return
//   }
//   if (nav.path) {
//     goNav(nav.path)
//     return
//   }
//   if (nav.name) {
//     goNav({ name: nav.name, params: nav.params, query: nav.query })
//   }
// }

// function readonlyTodoActionLabel(row) {
//   const t = String(row?.todoType || '')
//     .toUpperCase()
//     .replace(/-/g, '_')
//   if (t === 'REPLENISHMENT_CHAIN_WATCH') return '查看补仓状态流'
//   if (t === 'REPLENISHMENT_REPAY_CHAIN_WATCH') return '查看归仓状态流'
//   if (t.includes('REPLENISHMENT') && t.includes('REPAY')) return '查看归仓状态流'
//   return '查看链路'
// }

// function onViewReadonlyTodo(row) {
//   const nav = resolveTodoNavigation(row)
//   if (!nav?.path) {
//     showToast('暂无法跳转')
//     return
//   }
//   goNav(nav.path)
// }

/** pending-summary 由 MainLayout 统一请求（Tab 角标 + 各页共用），此处不再重复拉取 */
</script>

<style scoped>
.todo-hub {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  position: relative;
  overflow: hidden;
  overscroll-behavior: none;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /** 与 #app --app-page-bg 一致，避免与全局底灰、弧形蓝底衔接处出现两道色 */
  background: var(--app-page-bg, #eef2fb);
}

/**
 * 与首页同系品牌蓝 + 弧形；末端收到 --app-page-bg，与 .todo-hub 底色同一色，消除「蓝带与灰底」硬切色差。
 */
.todo-hub-bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 260px;
  background: linear-gradient(
    180deg,
    #1357f0 0%,
    #1f6fff 38%,
    #3d86ff 62%,
    #8eb4ff 82%,
    var(--app-page-bg, #eef2fb) 100%
  );
  border-radius: 0 0 50% 50% / 12%;
  z-index: 0;
  pointer-events: none;
}

.todo-hub__main {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 12px 12px;
}

/** 与团队页 .team-stats 卡片风格一致：双列指标 */
.todo-hub-stats {
  padding: 12px 0 4px;
  box-sizing: border-box;
}

.todo-hub-stats__card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.todo-hub-stats__label {
  font-size: 13px;
  color: #969799;
}

.todo-hub-stats__value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #1989fa;
}

.todo-hub-stats__value--hot {
  color: #ee4d4d;
}

.todo-hub__lead {
  margin: 4px 4px 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.45;
}

.todo-hub__section-head {
  margin-top: 6px;
  margin-bottom: 8px;
}

.todo-hub__section-head .section-title {
  color: var(--app-text-primary, #323233);
}

.todo-hub__section-head .section-subtitle {
  color: var(--app-text-tertiary, #969799);
}

/** 顶部蓝区上的小节标题 */
.todo-hub__section-head--on-blue .section-title {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 30, 90, 0.18);
}

.todo-hub__section-head--on-blue .section-subtitle {
  color: rgba(255, 255, 255, 0.88);
}

.todo-hub__block {
  margin-top: 0;
  margin-bottom: 14px;
}

/** is-link 右侧箭头与 #value 内角标重叠：保留数值区宽度并留出箭头位 */
.todo-quick :deep(.van-cell__value) {
  flex-shrink: 0;
  padding-right: 7px;
  padding-top: 7px;
}

.todo-hub__list-scope {
  margin-top: 0;
}

.todo-hub__loading {
  padding: 28px 0;
  display: flex;
  justify-content: center;
  border-radius: var(--app-radius-lg, 18px);
  background: var(--app-card-bg, #fff);
}

.todo-hub__empty {
  padding: 12px 0 20px;
  border-radius: var(--app-radius-lg, 18px);
}

.todo-hub__empty :deep(.van-empty) {
  padding: 24px 0;
}

.todo-hub__todo-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #323233);
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
  color: var(--app-text-secondary, #646566);
}

.todo-hub__todo-time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-tertiary, #969799);
}

.todo-hub__todo-reason {
  margin-top: 6px;
  font-size: 12px;
  color: #ee4d4d;
  line-height: 1.45;
}

.todo-hub__todo-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #576b95;
  line-height: 1.45;
}

.todo-hub__todo-actions {
  margin-top: 10px;
}
</style>
