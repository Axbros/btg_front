<template>
  <div>
    <AppHeader title="我的信息" />
    <van-loading v-if="loading" class="profile__loading" vertical>加载个人信息…</van-loading>
    <div v-else-if="userInfo" class="profile">
      <van-cell-group inset>
        <van-cell title="手机号" :value="String(userInfo.mobile ?? '—')" />
        <van-cell title="昵称" :value="String(userInfo.nickname ?? '—')" />
        <van-cell
          title="邀请码"
          :value="String(userInfo.invitationCode ?? '—')"
          is-link
          @click="copyInviteRegisterUrl"
        />
        <van-cell title="上级用户" :value="referrerNick(userInfo)" />
      </van-cell-group>

      <van-cell-group inset title="分润与结算" class="profile__block">
        <van-cell title="利润上报" is-link to="/profit-report/submit" />
        <van-cell title="我的利润上报记录" is-link to="/profit-report/mine" />
        <van-cell title="待支付给上级" is-link to="/settlement/pending-pay" />
        <van-cell title="待审核下级结算" is-link to="/settlement/pending-review" />
      </van-cell-group>

      <van-cell-group inset title="资料编辑" class="profile__edit">
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
.profile__edit,
.profile__block {
  margin-top: 12px;
}
.profile__logout {
  margin: 24px 16px 0;
}
</style>
