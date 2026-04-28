<template>
  <div>
    <AppHeader title="分润模式变更详情" />
    <van-loading v-if="loading" class="audit-detail__loading" vertical>加载中…</van-loading>
    <template v-else>
      <div class="audit-detail__transition">
        从 {{ modeText(detailBefore.commissionModeDesc) }} -> {{ modeText(detailAfter.commissionModeDesc) }}
      </div>
      <van-cell-group title="关联成员" inset>
        <van-cell title="团队长" :value="txt(detailAfter.parentNickname || detailBefore.parentNickname)" />
        <van-cell title="下级" :value="txt(detailAfter.childNickname || detailBefore.childNickname)" />
      </van-cell-group>
      <van-cell-group title="审核信息" inset class="audit-detail__group-gap">
        <van-cell title="审核状态">
          <template #value>
            <van-tag :type="auditStatusTagType(detailAuditStatusRaw)" plain round>
              {{ formatAuditStatus(detailAuditStatusRaw) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="审核时间" :value="formatDateTime(detailData.auditTime)" />
        <van-cell title="审核人" :value="detailAuditorDisplay" />
      </van-cell-group>
      <van-cell-group title="变更前" inset>
        <van-cell title="模式" :value="modeText(detailBefore.commissionModeDesc)" />
        <van-cell title="兜底比例" :value="formatRate(detailBefore.guaranteeRatio)" />
        <van-cell title="不兜底比例" :value="formatRate(detailBefore.nonGuaranteeRatio)" />
        <van-cell title="生效时间" :value="formatDateTime(detailBefore.activeAt)" />
      </van-cell-group>
      <van-cell-group title="变更后" inset class="audit-detail__group-gap">
        <van-cell title="模式" :value="modeText(detailAfter.commissionModeDesc)" />
        <van-cell title="兜底比例" :value="formatRate(detailAfter.guaranteeRatio)" />
        <van-cell title="不兜底比例" :value="formatRate(detailAfter.nonGuaranteeRatio)" />
        <van-cell title="提交时间" :value="formatDateTime(detailAfter.submitTime)" />
      </van-cell-group>

      <div v-if="detailIsPending" class="audit-detail__actions">
        <van-button block round type="primary" @click="openAction('approve')">同意</van-button>
        <van-button block round type="danger" @click="openAction('reject')">拒绝</van-button>
      </div>
    </template>

    <van-popup v-model:show="actionShow" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="action-popup">
        <div class="action-popup__title">{{ actionTitle }}</div>
        <p class="action-popup__hint">确认后将提交审核结果，备注可选。</p>
        <van-cell-group inset>
          <van-field
            v-model="actionRemark"
            rows="3"
            autosize
            type="textarea"
            maxlength="300"
            label="备注"
            placeholder="可选"
            show-word-limit
          />
        </van-cell-group>
        <div class="action-popup__actions">
          <van-button block round @click="actionShow = false">取消</van-button>
          <van-button
            block
            round
            :type="actionKind === 'reject' ? 'danger' : 'primary'"
            :loading="actionSubmitting"
            @click="submitAction"
          >
            确认{{ actionKind === 'reject' ? '拒绝' : '同意' }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import { approveModeChange, fetchModeChangeDetail, rejectModeChange } from '@/api/profitConfig'
import { useDashboardStore } from '@/stores/dashboard'
import { formatDateTime, formatRate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()

const loading = ref(true)
const detailData = ref({})

const actionShow = ref(false)
const actionKind = ref('approve')
const actionRemark = ref('')
const actionSubmitting = ref(false)

const pendingId = computed(() => {
  const n = Number(route.params.id)
  return Number.isFinite(n) && n > 0 ? n : null
})

const detailBefore = computed(() => {
  const d = detailData.value
  return d && typeof d === 'object' ? d.beforeActiveConfig ?? {} : {}
})
const detailAfter = computed(() => {
  const d = detailData.value
  return d && typeof d === 'object' ? d.afterPendingConfig ?? {} : {}
})

/** 顶层审核状态（与 GET mode-change-detail 的 data.auditStatus 一致） */
const detailAuditStatusRaw = computed(() => detailData.value?.auditStatus)

const detailAuditorDisplay = computed(() => {
  const nickname = detailData.value?.auditorNickname
  return nickname ? String(nickname).trim() : '—'
})

const actionTitle = computed(() => (actionKind.value === 'reject' ? '拒绝变更申请' : '同意变更申请'))
const detailIsPending = computed(() => {
  const s = detailAuditStatusRaw.value
  if (s == null || String(s).trim() === '') return true
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  return key === 'PENDING' || Number(s) === 1
})

function formatAuditStatus(s) {
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  if (key === 'PENDING' || Number(s) === 1) return '待审核'
  if (key === 'APPROVED' || Number(s) === 2) return '已通过'
  if (key === 'REJECTED' || Number(s) === 3) return '已拒绝'
  return txt(s)
}

function auditStatusTagType(s) {
  const key = String(s ?? '').trim().toUpperCase().replace(/-/g, '_')
  if (key === 'APPROVED' || Number(s) === 2) return 'success'
  if (key === 'REJECTED' || Number(s) === 3) return 'danger'
  if (key === 'PENDING' || Number(s) === 1) return 'warning'
  return 'default'
}

function txt(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

function modeText(v) {
  return txt(v)
}

function isForbiddenErr(e) {
  const code = Number(e?.code ?? e?.httpStatus)
  if (code === 401 || code === 403) return true
  const msg = String(e?.message ?? '').toLowerCase()
  return msg.includes('unauthorized') || msg.includes('forbidden')
}

function isConflictErr(e) {
  const code = Number(e?.code ?? e?.httpStatus)
  return code === 409
}

function backOrHome() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/home')
}

function toastErrorWithFallback(e, fallback = '操作失败，请稍后重试') {
  const msg = String(e?.message ?? '').trim()
  showToast(msg || fallback)
}

async function loadDetail() {
  const id = pendingId.value
  if (id == null) {
    loading.value = false
    detailData.value = {}
    showToast('无效配置 ID')
    backOrHome()
    return
  }
  loading.value = true
  detailData.value = {}
  try {
    detailData.value = await fetchModeChangeDetail(id, { skipGlobalToast: true })
  } catch (e) {
    if (isForbiddenErr(e)) {
      showToast('无权限访问，正在返回')
      backOrHome()
      return
    }
    toastErrorWithFallback(e, '详情加载失败')
    backOrHome()
  } finally {
    loading.value = false
  }
}

function openAction(kind) {
  if (!detailIsPending.value) {
    showToast('当前记录已非待审核状态')
    return
  }
  actionKind.value = kind
  actionRemark.value = ''
  actionShow.value = true
}

async function submitAction() {
  const id = pendingId.value
  if (id == null) {
    showToast('无效配置 ID')
    return
  }
  actionSubmitting.value = true
  try {
    const remark = actionRemark.value.trim()
    const body = remark ? { remark } : {}
    if (actionKind.value === 'reject') {
      await rejectModeChange(id, body, { skipGlobalToast: true })
      showToast('已拒绝')
    } else {
      await approveModeChange(id, body, { skipGlobalToast: true })
      showToast('已同意')
    }
    actionShow.value = false
    void dashboardStore.fetchPendingSummary({ silent: true })
    router.replace({ name: 'AdminProfitConfigAudits' })
  } catch (e) {
    if (isForbiddenErr(e)) {
      showToast('无权限访问，正在返回')
      actionShow.value = false
      backOrHome()
      return
    }
    if (isConflictErr(e)) {
      toastErrorWithFallback(e, '当前记录已非待审核状态')
      await loadDetail()
      return
    }
    toastErrorWithFallback(e, '提交失败，请稍后重试')
  } finally {
    actionSubmitting.value = false
  }
}

watch(pendingId, () => loadDetail(), { immediate: true })
</script>

<style scoped>
.audit-detail__loading {
  padding: 48px 0;
}
.audit-detail__transition {
  margin: 12px 16px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #1989fa;
  background: #f0f7ff;
}
.audit-detail__group-gap {
  margin-top: 8px;
}
.audit-detail__actions {
  margin: 14px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-popup {
  padding: 12px 0 calc(20px + env(safe-area-inset-bottom, 0px));
}
.action-popup__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px 4px;
}
.action-popup__hint {
  margin: 0 16px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  text-align: center;
}
.action-popup__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 0;
}
</style>
