<template>
  <div>
    <AppHeader title="归仓详情" />
    <van-loading v-if="loading" class="detail__loading" vertical>加载中…</van-loading>
    <RepayApplyDetailBody v-else-if="detail" :detail="detail" />
    <EmptyState v-else description="未获取到归仓信息" />

    <div v-if="detail && isPendingAudit" class="detail__actions">
      <van-button block round type="primary" @click="openApprove">通过</van-button>
      <van-button block round type="danger" @click="openReject">拒绝</van-button>
    </div>

    <van-dialog
      v-model:show="approveShow"
      title="确认通过该归仓申请？"
      show-cancel-button
      :before-close="onApproveBeforeClose"
    />

    <van-dialog
      v-model:show="rejectShow"
      title="拒绝（请填写备注）"
      show-cancel-button
      confirm-button-text="确认拒绝"
      confirm-button-color="#ee0a24"
      :before-close="onRejectBeforeClose"
    >
      <div class="dialog-field-wrap">
        <van-field
          v-model="rejectRemark"
          rows="3"
          autosize
          type="textarea"
          maxlength="200"
          placeholder="拒绝原因"
          show-word-limit
          :border="false"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import RepayApplyDetailBody from '@/components/RepayApplyDetailBody.vue'
import { fetchAdminRepayDetail, approveRepayAdmin, rejectRepayAdmin } from '@/api/adminReplenishment'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const detail = ref(null)

const approveShow = ref(false)
const rejectShow = ref(false)
const rejectRemark = ref('')

const repayId = computed(() => {
  const raw = route.params.id
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

const isPendingAudit = computed(() => Number(detail.value?.status) === 1)

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
    const raw = await fetchAdminRepayDetail(id)
    detail.value = raw && typeof raw === 'object' ? raw : null
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(repayId, () => loadDetail(), { immediate: true })

function openApprove() {
  approveShow.value = true
}

function openReject() {
  rejectRemark.value = ''
  rejectShow.value = true
}

async function onApproveBeforeClose(action) {
  if (action === 'cancel') return true
  const id = repayId.value
  if (id == null) return false
  try {
    await approveRepayAdmin(id, null)
    showToast('已通过')
    router.back()
    return true
  } catch {
    return false
  }
}

async function onRejectBeforeClose(action) {
  if (action === 'cancel') return true
  const id = repayId.value
  const remark = rejectRemark.value.trim()
  if (id == null) return false
  if (!remark) {
    showToast('请填写拒绝备注')
    return false
  }
  try {
    await rejectRepayAdmin(id, remark)
    showToast('已拒绝')
    router.back()
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.detail__loading {
  padding: 48px 0;
}
.detail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 24px;
}
.dialog-field-wrap {
  padding: 0 8px 8px;
}
</style>
