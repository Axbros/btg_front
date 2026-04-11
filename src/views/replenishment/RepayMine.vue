<template>
  <div>
    <AppHeader title="我的归仓记录" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="(row, idx) in list" :key="row.id ?? idx" class="card">
          <van-cell-group inset>
            <van-cell title="归仓单号" :value="txt(row.repayNo ?? row.repay_no)" />
            <van-cell title="状态">
              <template #value>
                <van-tag :type="repayStatusTagType(row.status)" plain round>
                  {{ formatRepayStatus(row.status) }}
                </van-tag>
              </template>
            </van-cell>
            <van-cell title="关联补仓 ID" :value="String(row.replenishApplyId ?? row.replenish_apply_id ?? '—')" />
            <van-cell title="归还金额" :value="formatMoney(row.repayAmount ?? row.repay_amount)" />
            <van-cell title="转账截图">
              <a v-if="img(row.repayScreenshotUrl ?? row.repay_screenshot_url)" :href="img(row.repayScreenshotUrl ?? row.repay_screenshot_url)" target="_blank" rel="noopener">查看</a>
              <span v-else>—</span>
            </van-cell>
            <van-cell title="提交时间" :value="formatDateTime(row.submitTime ?? row.submit_time)" />
          </van-cell-group>
        </div>
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
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchRepayMine } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatMoney, formatDateTime, formatRepayStatus, repayStatusTagType } from '@/utils/format'

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

function img(u) {
  return u ? String(u) : ''
}

async function fetchPage(p) {
  const raw = await fetchRepayMine({ page: p, size: pageSize.value })
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
.card {
  margin-bottom: 10px;
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
