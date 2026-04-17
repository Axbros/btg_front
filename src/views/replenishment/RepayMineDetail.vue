<template>
  <div>
    <AppHeader title="归仓详情" />
    <van-loading v-if="loading" class="repay-mine-detail__loading" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <RepayApplyDetailBody :detail="detail" />
      <van-cell-group v-if="showReturnedActions" inset class="repay-mine-detail__actions">
        <van-cell title="已退回待修改">
          <template #label>
            <div class="repay-mine-detail__btn-row">
              <van-button type="primary" size="small" block round @click="goResubmit">去修改并重提</van-button>
              <van-button type="default" size="small" block round plain @click="goFlow">查看状态流</van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </template>
    <EmptyState v-else description="未获取到归仓信息" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import RepayApplyDetailBody from '@/components/RepayApplyDetailBody.vue'
import { fetchRepayMineDetail } from '@/api/replenishment'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const detail = ref(null)

const repayId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

function isReturnedRepayStatus(s) {
  if (s == null || s === '') return false
  if (Number(s) === 4) return true
  return String(s).toUpperCase() === 'RETURNED_TO_APPLICANT'
}

const showReturnedActions = computed(() => {
  const d = detail.value
  if (!d || typeof d !== 'object') return false
  return isReturnedRepayStatus(d.status)
})

function goResubmit() {
  const id = repayId.value
  if (id == null) return
  router.push({ name: 'RepayResubmit', params: { id: String(id) } })
}

function goFlow() {
  const id = repayId.value
  if (id == null) return
  router.push({ name: 'RepayFlowDetail', params: { id: String(id) } })
}

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
.repay-mine-detail__actions {
  margin: 12px 16px 0;
}
.repay-mine-detail__btn-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
</style>
