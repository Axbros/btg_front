<template>
  <div class="repl-mine">
    <AppHeader title="补仓">
      <template #right>
        <van-icon
          name="gold-coin-o"
          class="repl-mine-header-icon"
          role="button"
          tabindex="0"
          aria-label="提交补仓申请"
          @click="goSubmitReplenishment"
          @keydown.enter.prevent="goSubmitReplenishment"
          @keydown.space.prevent="goSubmitReplenishment"
        />
      </template>
    </AppHeader>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="repl-mine-wrap" :class="{ 'repl-mine-wrap--docked': loaded }">
        <div v-if="currentUnsettled" class="hub-banner">
          <van-tag
            :type="replenishmentStatusTagType(currentUnsettled.status)"
            plain
            round
            class="hub-banner__tag"
          >
            {{ formatReplenishmentStatus(currentUnsettled.status) }}
          </van-tag>
          <p class="hub-banner__text">{{ hubBannerRest }}</p>
        </div>
        <van-cell-group v-if="currentUnsettled" inset title="当前未结清补仓" class="hub-current">
          <van-cell title="剩余待归还" :value="formatMoney(currentUnsettled.remainingAmount ?? 0)" />
          <van-cell title="资方转账凭证">
            <template #value>
              <PreviewableRemoteImage v-if="transferProofUrl" :url="transferProofUrl" alt="资方转账凭证" />
              <span v-else>—</span>
            </template>
          </van-cell>
          <van-cell v-if="transferRemarkText" title="资方转账备注" :value="transferRemarkText" />
        </van-cell-group>

        <p v-if="list.length || loaded" class="repl-mine-list-title">补仓记录</p>

        <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <van-cell-group v-if="list.length" inset :border="false" class="repl-mine-list-group">
            <van-cell
              v-for="row in list"
              :key="row.id"
              :title="txt(row.applyNo)"
              :label="moneyTxt(row.replenishAmount)"
              :border="false"
              is-link
              role="button"
              tabindex="0"
              @click="goDetail(row)"
              @keydown.enter.prevent="goDetail(row)"
            >
              <template #value>
                <van-tag :type="replenishmentStatusTagType(row.status)" plain round>
                  {{ formatReplenishmentStatus(row.status) }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <EmptyState v-if="!loading && !list.length && loaded" />
        </van-list>
      </div>
    </van-pull-refresh>

    <div v-show="loaded" class="repl-mine-bottom-dock" aria-label="底部汇总与分页">
      <footer v-if="recordsTotal > 0" class="repl-mine-footer-sum" aria-label="补仓金额汇总">
        <div class="repl-mine-footer-sum__row">
          <span class="repl-mine-footer-sum__label">{{ replenishSumLabel }}</span>
          <span class="repl-mine-footer-sum__value">{{ formatMoney(replenishAmountPageSum) }}</span>
        </div>
        <p class="repl-mine-footer-sum__meta">共 {{ recordsTotal }} 笔</p>
      </footer>
      <div class="repl-mine-pager" role="toolbar" aria-label="分页">
        <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
        <span class="repl-mine-pager__text">第 {{ page }} 页</span>
        <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PreviewableRemoteImage from '@/components/PreviewableRemoteImage.vue'
import { fetchReplenishmentCurrent, fetchReplenishmentMine } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatReplenishmentStatus, replenishmentStatusTagType } from '@/utils/format'

const router = useRouter()

/** GET /replenishments/current，原补仓首页横幅与「当前未结清」区块 */
const currentUnsettled = ref(null)

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)
/** 列表总条数（分页 total，与当前页 list 长度可对照） */
const recordsTotal = ref(0)

const transferProofUrl = computed(
  () => String(currentUnsettled.value?.transferScreenshotUrl ?? '').trim(),
)

const transferRemarkText = computed(
  () => String(currentUnsettled.value?.transferRemark ?? '').trim(),
)

const hubBannerRest = computed(() => {
  const rem = formatMoney(currentUnsettled.value?.remainingAmount)
  return `当前补仓单；剩余待归还 ${rem} 元（含待审核归仓请留意额度）。`
})

const replenishAmountPageSum = computed(() =>
  list.value.reduce((sum, row) => sum + Number(row.replenishAmount), 0),
)

const replenishSumLabel = computed(() => {
  if (
    !hasMore.value &&
    recordsTotal.value > 0 &&
    list.value.length === recordsTotal.value
  ) {
    return '补仓金额合计'
  }
  return '本页补仓金额合计'
})

async function loadCurrentUnsettled() {
  currentUnsettled.value = await fetchReplenishmentCurrent()
}

function goSubmitReplenishment() {
  router.push({ name: 'ReplenishmentSubmit' })
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function moneyTxt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return "补仓金额："+formatMoney(v)
}

function goDetail(row) {
  router.push({ name: 'ReplenishmentMineDetail', params: { id: String(row.id) } })
}

async function fetchPage(p) {
  const raw = await fetchReplenishmentMine({ page: p, size: pageSize.value })
  const parsed = parsePageResponse(raw, pageSize.value)
  list.value = parsed.list
  hasMore.value = parsed.hasMore
  finished.value = !parsed.hasMore
  loaded.value = true
  recordsTotal.value = parsed.total
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchPage(page.value)
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  try {
    await Promise.all([fetchPage(1), loadCurrentUnsettled()])
  } finally {
    refreshing.value = false
  }
}

function prev() {
  if (page.value <= 1) return
  page.value -= 1
  fetchPage(page.value)
}

function next() {
  if (!hasMore.value) return
  page.value += 1
  fetchPage(page.value)
}

onMounted(() => {
  void loadCurrentUnsettled()
})
</script>

<style scoped>
.repl-mine {
  min-width: 0;
}
.repl-mine-wrap {
  min-height: 40px;
  box-sizing: border-box;
}
.repl-mine-wrap--docked {
  /* 为底部固定区预留空间（汇总 + 分页 + 底栏安全区，略放大避免裁切） */
  padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
}
.repl-mine-bottom-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.repl-mine-header-icon {
  display: block;
  font-size: 22px;
  color: #1989fa;
  padding: 4px 10px 4px 4px;
  margin-right: -6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.repl-mine-list-title {
  margin: 16px 16px 8px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.repl-mine-list-group {
  margin-top: 4px;
  background: transparent;
}
/* 行与行之间留出上下空白（与页面底背景区分，参见归仓 list） */
.repl-mine-list-group :deep(.van-cell) {
  margin: 0 0 8px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}
.repl-mine-list-group :deep(.van-cell:last-of-type) {
  margin-bottom: 0;
}
.repl-mine-list-group :deep(.van-cell__title) {
  flex: 1.2;
  min-width: 0;
  font-weight: 500;
}
.repl-mine-list-group :deep(.van-cell__value) {
  flex-shrink: 0;
}
.hub-current {
  margin-bottom: 4px;
}
.hub-banner {
  margin: 10px 16px 0;
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 10px;
  background: #f7f8fa;
  border-radius: 8px;
  box-sizing: border-box;
}
.hub-banner__tag {
  flex-shrink: 0;
  margin-top: 2px;
}
.hub-banner__text {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #646566;
}
.repl-mine-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px 12px;
  border-top: 1px solid #ebedf0;
  box-sizing: border-box;
}
.repl-mine-pager__text {
  font-size: 13px;
  color: #646566;
}
.repl-mine-footer-sum {
  margin: 0;
  padding: 10px 16px 4px;
  background: #f7f8fa;
  box-sizing: border-box;
  border: none;
}
.repl-mine-footer-sum__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.repl-mine-footer-sum__label {
  font-size: 14px;
  color: #646566;
}
.repl-mine-footer-sum__value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
  flex-shrink: 0;
}
.repl-mine-footer-sum__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
}
</style>
