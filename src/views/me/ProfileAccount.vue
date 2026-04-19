<template>
  <div>
    <AppHeader title="账户信息" />
    <van-loading v-if="loading && !userInfo" class="profile-sub__loading" vertical>加载中…</van-loading>
    <div v-else-if="userInfo" class="profile-sub">
      <van-cell-group inset>
        <van-cell title="手机号码" :value="String(userInfo.mobile ?? '—')" />
        <van-cell title="真实姓名" :value="String(userInfo.nickname ?? '—')" />
        <van-cell title="账号状态">
          <template #value>
            <van-tag :type="userStatusTagType(userInfo.status)" plain round>
              {{ formatUserStatus(userInfo.status) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="所属上级" :value="referrerNick(userInfo)" />
        <!-- <van-cell
          v-if="auth.canShowInviteCode"
          class="profile-invite-cell"
          title="邀请码（点击复制）"
          :value="String(userInfo.invitationCode ?? '—')"
          is-link
          @click="copyInviteRegisterUrl"
        /> -->
        <!-- <van-cell title="账户资金快照（MT5）" is-link :to="{ name: 'Mt5Snapshot' }" /> -->
      </van-cell-group>
    </div>
    <EmptyState v-else description="未获取到用户信息" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useProfileCore } from '@/composables/useProfileCore'

const {
  auth,
  userInfo,
  reloadProfile,
  formatUserStatus,
  userStatusTagType,
  referrerNick,
} = useProfileCore()

const router = useRouter()
const loading = ref(true)

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

/** 带邀请码的完整注册页 URL */
function inviteRegisterUrl() {
  if (!auth.canShowInviteCode) return ''
  const code = String(userInfo.value?.invitationCode ?? '').trim()
  if (!code) return ''
  const { fullPath } = router.resolve({
    path: '/register',
    query: { invitationCode: code },
  })
  return `${window.location.origin}${fullPath}`
}

async function copyInviteRegisterUrl() {
  const url = inviteRegisterUrl()
  if (!url) {
    showToast('暂无邀请码')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const input = document.createElement('input')
      input.value = url
      input.setAttribute('readonly', 'readonly')
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    showToast('注册链接已复制')
  } catch {
    showToast('复制失败，请手动复制链接')
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
.profile-invite-cell :deep(.van-cell__title),
.profile-invite-cell :deep(.van-cell__value) {
  color: #ee0a24;
  font-weight: 700;
}
</style>
