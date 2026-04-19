<template>
  <div>
    <AppHeader title="资格审核" />
    <van-loading v-if="loading && !userInfo" class="profile-sub__loading" vertical>加载中…</van-loading>
    <div v-else-if="userInfo && qualificationSectionVisible" class="profile-sub">
      <van-cell-group inset>
        <van-cell title="审核状态">
          <template #value>
            <van-tag :type="qualificationStatusTagType(qualStatusForDisplay)" plain round>
              {{ formatQualificationStatus(qualStatusForDisplay) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="审核时间" :value="formatDateTime(qualificationAuditTime)" />
        <van-cell title="审核备注" :value="txtCell(qualificationAuditRemark)" />
        <van-cell title="提交次数" :value="txtCell(qualificationSubmitCount)" />
        <van-cell title="最近提交时间" :value="formatDateTime(qualificationLastSubmitTime)" />
      </van-cell-group>

      <div v-if="showQualRejectedActions" class="profile-sub__actions">
        <van-button block round plain type="primary" @click="goToProfileComplete">修改资料</van-button>
        <van-button block round type="primary" class="profile-sub__actions__second" @click="resubmitDialogShow = true">
          重新提交审核
        </van-button>
      </div>
    </div>
    <EmptyState v-else-if="userInfo" description="暂无资格审核信息" />
    <EmptyState v-else description="未获取到用户信息" />

    <van-dialog
      v-model:show="resubmitDialogShow"
      title="重新提交资格审核"
      show-cancel-button
      confirm-button-text="提交"
      :before-close="onResubmitBeforeClose"
    >
      <div class="profile-sub__dialog-pad">
        <van-field
          v-model="resubmitRemark"
          rows="3"
          autosize
          type="textarea"
          maxlength="200"
          show-word-limit
          placeholder="可选：说明已补充的资料等"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useProfileCore } from '@/composables/useProfileCore'
import { resubmitQualification } from '@/api/userQualification'

const {
  auth,
  userInfo,
  reloadProfile,
  qualificationSectionVisible,
  qualStatusForDisplay,
  qualificationAuditTime,
  qualificationAuditRemark,
  qualificationSubmitCount,
  qualificationLastSubmitTime,
  showQualRejectedActions,
  formatDateTime,
  formatQualificationStatus,
  qualificationStatusTagType,
  txtCell,
} = useProfileCore()

const router = useRouter()
const loading = ref(true)
const resubmitDialogShow = ref(false)
const resubmitRemark = ref('')

onMounted(async () => {
  if (!auth.isLogin) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    await reloadProfile()
  } finally {
    loading.value = false
  }
})

function goToProfileComplete() {
  router.push({ name: 'ProfileComplete' })
}

async function onResubmitBeforeClose(action) {
  if (action === 'cancel') return true
  try {
    await resubmitQualification({ remark: resubmitRemark.value.trim() || undefined })
    showToast({ type: 'success', message: '已重新提交审核' })
    resubmitRemark.value = ''
    await reloadProfile()
    return true
  } catch {
    return false
  }
}
</script>

<style scoped>
.profile-sub__loading {
  padding: 48px 0;
}
.profile-sub {
  margin-top: 12px;
  padding-bottom: 24px;
}
.profile-sub__actions {
  margin-top: 16px;
  padding: 0 16px;
}
.profile-sub__actions__second {
  margin-top: 10px;
}
.profile-sub__dialog-pad {
  padding: 12px 16px 8px;
}
</style>
