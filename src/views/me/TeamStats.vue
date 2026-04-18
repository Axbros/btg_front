<template>
  <div>
    <AppHeader title="团队统计" />
    <div v-if="stats" class="stats">
      <van-row :gutter="10">
        <van-col span="12">
          <div class="stats__card">
            <div class="stats__label">直属人数</div>
            <div class="stats__value">{{ stats.directCount }}</div>
          </div>
        </van-col>
        <van-col span="12">
          <div class="stats__card">
            <div class="stats__label">全部下级人数</div>
            <div class="stats__value">{{ stats.allDescendantCount }}</div>
          </div>
        </van-col>
      </van-row>
    </div>
    <van-loading v-else-if="loading" class="stats__loading" vertical>加载中…</van-loading>
    <EmptyState v-else />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchTeamStats } from '@/api/user'

const stats = ref(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    stats.value = await fetchTeamStats()
  } catch {
    stats.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stats {
  padding: 12px;
}
.stats__card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
}
.stats__label {
  font-size: 13px;
  color: #969799;
}
.stats__value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1989fa;
}
.stats__loading {
  padding: 48px 0;
}
</style>
