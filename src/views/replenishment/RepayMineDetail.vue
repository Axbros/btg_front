<template>
  <div>
    <AppHeader title="归仓详情" />
    <van-loading v-if="loading" class="repay-mine-detail__loading" vertical>加载中…</van-loading>
    <RepayApplyDetailBody v-else-if="detail" :detail="detail" />
    <EmptyState v-else description="未获取到归仓信息" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import RepayApplyDetailBody from '@/components/RepayApplyDetailBody.vue'
import { fetchRepayMineDetail } from '@/api/replenishment'

const route = useRoute()

const loading = ref(true)
const detail = ref(null)

const repayId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

async function loadDetail() {
  const id = repayId.value
  if (id == null) {
    loading.value = false
    detail.value = null
    return
  }
  loading.value = true
  detail.value = null
  try {
    const raw = await fetchRepayMineDetail(id)
    detail.value = raw && typeof raw === 'object' ? raw : null
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(repayId, () => loadDetail(), { immediate: true })
</script>

<style scoped>
.repay-mine-detail__loading {
  padding: 48px 0;
}
</style>
