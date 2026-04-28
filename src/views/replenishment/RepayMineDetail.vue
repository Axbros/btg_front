<template>
  <div>
    <AppHeader title="归仓详情" />
    <van-loading v-if="loading" class="repay-mine-detail__loading" vertical>加载中…</van-loading>
    <template v-else-if="detail">
      <RepayApplyDetailBody :detail="detail" />

      <van-cell-group v-if="showReviewerActions" inset title="审核" class="repay-mine-detail__review">
        <div class="repay-mine-detail__review-pad">
          <van-button type="success" block round :loading="approveSubmitting" @click="onApprove">通过</van-button>
          <van-button type="danger" block round @click="openReject">拒绝</van-button>
        </div>
      </van-cell-group>

      <div v-if="showReturnedActions" class="repay-mine-detail__action-block">
        <!-- <p class="repay-mine-detail__action-title">已退回待修改</p> -->
        <div class="repay-mine-detail__btn-row">
          <van-button type="primary"  block round @click="goResubmit">去修改并重提</van-button>
          <van-button type="default"  block round plain @click="goFlow">查看状态流</van-button>
        </div>
      </div>
    </template>
    <EmptyState v-else description="未获取到归仓信息" />

    <van-popup v-model:show="rejectShow" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="action-popup">
        <div class="action-popup__title">拒绝归仓</div>
        <van-cell-group inset>
          <van-field
            v-model="rejectRemark"
            rows="3"
            autosize
            type="textarea"
            maxlength="500"
            placeholder="拒绝原因（必填）"
            show-word-limit
          />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="rejectShow = false">取消</van-button>
          <van-button block round type="danger" :loading="rejectSubmitting" @click="confirmReject">确认拒绝</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import RepayApplyDetailBody from '@/components/RepayApplyDetailBody.vue'
import { useAuthStore } from '@/stores/auth'
import { approveRepayApply, fetchRepayMineDetail, rejectRepayApply } from '@/api/replenishment'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const loading = ref(true)
const detail = ref(null)

const rejectShow = ref(false)
const rejectRemark = ref('')
const approveSubmitting = ref(false)
const rejectSubmitting = ref(false)

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

const myUserId = computed(() => {
  const n = Number(userInfo.value?.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

function isPendingCapitalReviewStatus(s) {
  if (s == null || s === '') return false
  if (Number(s) === 1) return true
  return String(s).toUpperCase().replace(/-/g, '_') === 'PENDING_CAPITAL_REVIEW'
}

/** 待资方审核且当前用户为审核人（capitalUserId） */
const showReviewerActions = computed(() => {
  const d = detail.value
  if (!d || myUserId.value == null) return false
  if (!isPendingCapitalReviewStatus(d.status)) return false
  const cap = Number(d.capitalUserId ?? d.capital_user_id)
  if (!Number.isFinite(cap) || cap <= 0) return false
  return cap === myUserId.value
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

async function onApprove() {
  const id = repayId.value
  if (id == null) return
  try {
    await showConfirmDialog({
      title: '确认通过',
      message: '确定通过该归仓申请？提交后将无法撤销。',
      confirmButtonText: '确认通过',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  approveSubmitting.value = true
  try {
    await approveRepayApply(id, {})
    showToast({ type: 'success', message: '已通过' })
    await loadDetail()
  } catch {
    /* 请求层 */
  } finally {
    approveSubmitting.value = false
  }
}

function openReject() {
  rejectRemark.value = ''
  rejectShow.value = true
}

async function confirmReject() {
  const id = repayId.value
  if (id == null) return
  const remark = rejectRemark.value.trim()
  if (!remark) {
    showToast('请填写拒绝原因')
    return
  }
  rejectSubmitting.value = true
  try {
    await rejectRepayApply(id, { remark })
    showToast({ type: 'success', message: '已拒绝' })
    rejectShow.value = false
    await loadDetail()
  } catch {
    /* */
  } finally {
    rejectSubmitting.value = false
  }
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
.repay-mine-detail__btn-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.repay-mine-detail__action-block {
  margin: 12px 16px 0;
  box-sizing: border-box;
}
.repay-mine-detail__action-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.repay-mine-detail__review {
  margin-top: 8px;
}
.repay-mine-detail__review-pad {
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
}
.action-popup {
  padding: 12px 0 20px;
}
.action-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.action-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
.action-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
</style>
