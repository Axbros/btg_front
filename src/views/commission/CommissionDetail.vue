<template>
  <div>
    <AppHeader title="佣金详情" />
    <div v-if="loading" class="detail__loading">
      <van-loading type="spinner" size="24px">加载中…</van-loading>
    </div>
    <CommissionRecordCard v-else-if="record" :item="record" />
    <EmptyState v-else description="无法加载该流水" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import CommissionRecordCard from '@/components/CommissionRecordCard.vue'
import { fetchMyCommissionById } from '@/api/commission'

const route = useRoute()

const loading = ref(true)
const record = ref(null)

const commissionId = computed(() => {
  const id = route.params.id
  const n = Number(id)
  return Number.isFinite(n) ? n : null
})

async function load() {
  const id = commissionId.value
  if (id == null) {
    record.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    record.value = await fetchMyCommissionById(id)
  } catch {
    record.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => load(),
)
</script>

<style scoped>
.detail__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
</style>
