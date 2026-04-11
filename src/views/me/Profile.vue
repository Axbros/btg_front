<template>
  <div>
    <AppHeader title="我的信息" />
    <van-loading v-if="loading" class="profile__loading" vertical>加载个人信息…</van-loading>
    <div v-else-if="userInfo" class="profile">
      <van-cell-group inset>
        <!-- <van-cell title="用户ID" :value="String(userInfo.id ?? '—')" /> -->
        <van-cell title="手机号" :value="String(userInfo.mobile ?? '—')" />
        <van-cell title="昵称" :value="String(userInfo.nickname ?? '—')" />
        <van-cell title="KYC 状态" :value="formatKycStatus(userInfo.kycStatus ?? userInfo.kyc_status)" />
        <!-- <van-cell title="账号状态" :value="formatUserStatus(userInfo.status)" /> -->
        <!-- <van-cell title="是否根用户" :value="rootText" /> -->
        <!-- <van-cell title="推荐人ID" :value="String(userInfo.referrerUserId ?? '—')" /> -->
        <van-cell
          title="邀请码"
          :value="String(userInfo.invitationCode ?? '—')"
          is-link

          @click="copyInviteRegisterUrl"
        />
          <van-cell title="上级用户" :value="referrerNick(userInfo)" />
        <!-- <van-cell title="ancestor_path" :value="String(userInfo.ancestorPath ?? '—')" /> -->
      </van-cell-group>
      <van-cell-group v-if="auth.isAdmin" inset title="管理" class="profile__admin">
        <van-cell title="待审核收益" is-link to="/admin/pending" />
        <van-cell title="策略管理" is-link to="/admin/strategies" />
      </van-cell-group>
      <van-cell-group v-if="showProfileCompleteEntry(userInfo)" inset title="资料编辑" class="profile__edit">
        <van-cell title="完善资料" is-link to="/me/profile-complete" />
      </van-cell-group>
      <div class="profile__logout">
        <van-button block round type="danger" plain @click="onLogout">退出登录</van-button>
      </div>
    </div>
    <EmptyState v-else description="未获取到用户信息" />

    <van-dialog
      v-model:show="logoutDialogShow"
      title="确认退出？"
      show-cancel-button
      @confirm="onLogoutConfirm"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { fetchMe } from '@/api/user'
import { formatKycStatus } from '@/utils/format'

/** 待审、已通过：不显示「完善资料」（与 ProfileComplete 不可编辑一致） */
function showProfileCompleteEntry(u) {
  const v = u?.kycStatus ?? u?.kyc_status
  if (v === null || v === undefined || v === '') return true
  const n = Number(v)
  if (Number.isNaN(n)) return true
  return n !== 1 && n !== 2
}

function referrerNick(u) {
  const n = u?.referrerNickname ?? u?.referrer_nickname
  return n != null && String(n).trim() !== '' ? String(n) : '—'
}

const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)
const router = useRouter()

const loading = ref(true)
const logoutDialogShow = ref(false)

onMounted(async () => {
  if (!auth.isLogin) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
  } catch {
    /* 保留本地已有 userInfo，避免整页空白 */
  } finally {
    loading.value = false
  }
})

function buildRegisterInviteUrl() {
  const code = String(userInfo.value?.invitationCode ?? '').trim()
  if (!code) return ''
  const { fullPath } = router.resolve({
    path: '/register',
    query: { invitationCode: code },
  })
  return `${window.location.origin}${fullPath}`
}

async function copyInviteRegisterUrl() {
  const code = String(userInfo.value?.invitationCode ?? '').trim()
  if (!code) {
    showToast('暂无邀请码')
    return
  }
  const url = buildRegisterInviteUrl()
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

function onLogout() {
  logoutDialogShow.value = true
}

function onLogoutConfirm() {
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.profile__loading {
  padding: 48px 0;
}
.profile {
  margin-top: 12px;
  padding-bottom: 24px;
}
.profile__admin,
.profile__edit {
  margin-top: 12px;
}
.profile__logout {
  margin: 24px 16px 0;
}
</style>
