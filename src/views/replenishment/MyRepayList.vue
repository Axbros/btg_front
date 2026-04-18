<template>
  <div class="my-repay-list">
    <AppHeader title="归仓申请" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <template v-if="list.length">
          <van-cell-group
            v-for="(row, idx) in list"
            :key="rowKey(row, idx)"
            inset
            class="mine-card"
          >
            <div class="mine-card__head">
              <span class="mine-card__no">{{ txt(row.replenishApplyNo) }}</span>
              <van-tag :type="repayStatusTagType(row.status)" plain round>
                {{ formatRepayStatus(row.status) }}
              </van-tag>
            </div>
            <van-cell title="补仓申请金额" :value="formatMoney(num(row.approvedAmount))" />
            <van-cell title="完成归仓金额" :value="formatMoney(num(row.repaidAmount))" />
            <van-cell title="待审归仓金额" :value="formatMoney(num(row.pendingRepayAmount))" />
            <!-- <van-cell title="剩余归仓金额" :value="formatMoney(num(row.remainingAmount))" /> -->
            <van-cell title="资方执行用户" :value="txt(row.capitalUserName)" />
            <!-- <van-cell title="资方收款 UID" :value="txt(row.capitalReceiverUid)" /> -->
            <!-- <van-cell title="当前处理人" :value="txt(row.currentHandlerUserName)" /> -->
            <van-cell v-if="hasRejectReason(row)" title="拒绝原因" :label="txt(row.lastRejectReason)" />
            <!-- <van-cell title="提交次数" :value="submitVersionText(row.submitVersion)" /> -->
            <van-cell title="操作">
              <template #value>
                <div class="mine-card__actions">
                  <van-button size="small" type="primary" plain @click.stop="goDetail(row)">查看详情</van-button>
                  <van-button size="small" type="default" plain @click.stop="goFlow(row)">查看状态流</van-button>
                  <van-button
                    v-if="isReturnedToApplicant(row.status)"
                    size="small"
                    type="warning"
                    plain
                    @click.stop="goResubmit(row)"
                  >
                    去修改并重提
                  </van-button>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </template>
        <EmptyState v-if="!loading && !list.length && loaded" />
      </van-list>
    </van-pull-refresh>
    <div class="pager">
      <van-button size="small" :disabled="page <= 1" @click="prev">上一页</van-button>
      <span class="pager__text">第 {{ page }} 页</span>
      <van-button size="small" :disabled="!hasMore" @click="next">下一页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getMyRepayApplyList } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatRepayStatus, repayStatusTagType } from '@/utils/format'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(false)
const loaded = ref(false)

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function rowKey(row, idx) {
  return String(row.id ?? row.replenishApplyId ?? `row-${idx}`)
}

function submitVersionText(v) {
  if (v == null || v === '') return '—'
  return String(v)
}

function isReturnedToApplicant(status) {
  if (status == null || status === '') return false
  const s = String(status).toUpperCase()
  if (s === 'RETURNED_TO_APPLICANT') return true
  const n = Number(status)
  return !Number.isNaN(n) && n === 4
}

function hasRejectReason(row) {
  const r = row?.lastRejectReason
  return r != null && String(r).trim() !== ''
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

function goResubmit(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayResubmit', params: { id: String(id) } })
}

function goFlow(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayFlowDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await getMyRepayApplyList({ page: p, size: pageSize.value })
  const { list: rows, hasMore: more } = parsePageResponse(raw, pageSize.value)
  list.value = rows
  hasMore.value = more
  finished.value = !more
  loaded.value = true
}

async function onLoad() {
  if (refreshing.value) return
  loading.value = true
  try {
    await fetchPage(page.value)
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  page.value = 1
  try {
    await fetchPage(1)
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
</script>

<style scoped>
.my-repay-list {
  padding-bottom: env(safe-area-inset-bottom);
}
.mine-card {
  margin-top: 12px;
}
.mine-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px 4px;
  border-bottom: 1px solid #ebedf0;
}
.mine-card__no {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  word-break: break-all;
  flex: 1;
  min-width: 0;
}
.mine-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 20px;
}
.pager__text {
  font-size: 13px;
  color: #646566;
}
</style>
