<template>
  <div>
    <AppHeader title="下级归仓记录" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <van-cell-group v-if="list.length">
          <van-cell
            v-for="(row, idx) in list"
            :key="row.id ?? idx"
            is-link
            @click="goDetail(row)"
          >
            <template #title>
              <div class="sub-repay__title">
                <span class="sub-repay__no">{{ txt(row.repayNo ?? row.repay_no) }}</span>
                <span v-if="applicantHint(row)" class="sub-repay__sub">{{ applicantHint(row) }}</span>
              </div>
            </template>
            <template #value>
              <van-tag :type="repayStatusTagType(row.status)" plain round>
                {{ formatRepayStatus(row.status) }}
              </van-tag>
            </template>
          </van-cell>
        </van-cell-group>
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
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchTeamRepays } from '@/api/replenishment'
import { parsePageResponse } from '@/utils/pagination'
import { formatRepayStatus, repayStatusTagType } from '@/utils/format'

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

function applicantHint(row) {
  const nick = row.userNickname ?? row.user_nickname
  const mobile = row.userMobile ?? row.user_mobile
  const n = nick != null && String(nick).trim() !== '' ? String(nick).trim() : ''
  const m = mobile != null && String(mobile).trim() !== '' ? String(mobile).trim() : ''
  if (n && m) return `${n}#${m}`
  if (n) return n
  if (m) return m
  return ''
}

function goDetail(row) {
  const id = row?.id
  if (id == null) return
  router.push({ name: 'RepayMineDetail', params: { id: String(id) } })
}

async function fetchPage(p) {
  const raw = await fetchTeamRepays({ page: p, size: pageSize.value })
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
    showToast('加载失败，请稍后重试')
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
.sub-repay__title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.sub-repay__no {
  font-size: 15px;
  color: #323233;
}
.sub-repay__sub {
  font-size: 12px;
  color: #969799;
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
