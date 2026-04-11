<template>
  <div>
    <AppHeader title="启用中的分佣策略" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-loading v-if="loading && !list.length" vertical class="pad">加载中…</van-loading>
      <template v-else-if="list.length">
        <van-cell-group v-for="(s, i) in list" :key="val(s, i)" class="strategy-group">
          <van-cell
            :title="strategyName(s)"
            :value="formatRate(s.commissionRate ?? s.rate)"
            :label="strategyDesc(s)"
            class="strategy-cell"
          />
        </van-cell-group>
      </template>
      <EmptyState v-else />
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchStrategies } from '@/api/strategy'
import { asList } from '@/utils/list'
import { formatRate } from '@/utils/format'

const list = ref([])
const loading = ref(false)
const refreshing = ref(false)

function val(s, i) {
  return String(s.id ?? s.strategyId ?? `i-${i}`)
}

function strategyName(s) {
  return String(s.strategyName ?? s.name ?? '未命名策略')
}

function strategyDesc(s) {
  const d = s.description ?? s.remark
  if (d == null || String(d).trim() === '') return '—'
  return String(d)
}

async function load() {
  loading.value = true
  try {
    const raw = await fetchStrategies()
    list.value = asList(raw)
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.pad {
  padding: 40px 0;
}
.strategy-group {
  margin-bottom: 8px;
}
.strategy-group:last-child {
  margin-bottom: 0;
}
.strategy-cell :deep(.van-cell__title) {
  font-weight: 600;
  flex-shrink: 1;
}
.strategy-cell :deep(.van-cell__value) {
  flex: none;
  color: var(--van-primary-color);
  font-weight: 600;
}
.strategy-cell :deep(.van-cell__label) {
  margin-top: 8px;
  line-height: 1.5;
  color: #646566;
}
</style>
