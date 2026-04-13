<template>
  <div>
    <AppHeader title="我的信息" />
    <van-loading v-if="loading" class="profile__loading" vertical>加载个人信息…</van-loading>
    <div v-else-if="userInfo" class="profile">
      <div v-if="auth.canShowInviteCode && inviteRegisterUrl" class="invite-qr">
        <div class="invite-qr__title">邀请注册</div>
        <div class="invite-qr__canvas-wrap">
          <van-loading v-if="inviteQrLoading" type="spinner" size="28px" vertical>生成二维码…</van-loading>
          <img
            v-else-if="inviteQrDataUrl"
            class="invite-qr__img"
            :src="inviteQrDataUrl"
            alt="邀请注册链接二维码"
            width="220"
            height="220"
          />
          <p v-else-if="inviteQrFailed" class="invite-qr__err">二维码生成失败，请点下方「邀请码」复制链接</p>
        </div>
        <p class="invite-qr__hint">扫码打开注册页</p>
      </div>
      <van-cell-group inset>
        <van-cell title="登陆手机" :value="String(userInfo.mobile ?? '—')" />
        <van-cell title="登陆昵称" :value="String(userInfo.nickname ?? '—')" />
        <van-cell title="账号状态">
          <template #value>
            <van-tag :type="userStatusTagType(userInfo.status)" plain round>
              {{ formatUserStatus(userInfo.status) }}
            </van-tag>
          </template>
        </van-cell>
       
        <van-cell title="上级用户" :value="referrerNick(userInfo)" />
        <van-cell
          v-if="auth.canShowInviteCode"
          class="profile-invite-cell"
          title="邀请码（点击复制）"
          :value="String(userInfo.invitationCode ?? '—')"
          is-link
          @click="copyInviteRegisterUrl"
        />
      </van-cell-group>

      <van-cell-group v-if="profileDetailRows.length" inset title="资料信息" class="profile__block">
        <van-cell
          v-for="(row, idx) in profileDetailRows"
          :key="idx"
          :title="row.title"
          :value="row.value"
        />
      </van-cell-group>

      <!-- <van-cell-group inset title="分润与结算" class="profile__block">
        <van-cell title="利润上报" is-link to="/profit-report/submit" />
        <van-cell title="我的利润上报记录" is-link to="/profit-report/mine" />
        <van-cell title="待支付给上级" is-link to="/settlement/pending-pay" />
        <van-cell title="待审核下级结算" is-link to="/settlement/pending-review" />
      </van-cell-group> -->

      <div class="profile__edit profile__complete-entry">
       
        <van-button block round type="primary" @click="goToProfileComplete">更新资料</van-button>
      </div>
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
import { computed, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { showToast } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { fetchMe } from '@/api/user'
import { formatMoney, formatUserStatus, userStatusTagType } from '@/utils/format'

function pickProfile(u) {
  const p = u?.profile
  if (!p || typeof p !== 'object') return null
  return {
    nickname: p.nickname,
    realName: p.realName,
    idCardNo: p.idCardNo,
    serverName: p.serverName,
    tradingAccountId: p.tradingAccountId,
    exchangeUid: p.exchangeUid,
    principalAmount: p.principalAmount,
    walletName: p.walletName,
    walletAddress: p.walletAddress,
  }
}

/** 后端 /me profile 块：有值才展示 */
const profileDetailRows = computed(() => {
  const p = pickProfile(userInfo.value)
  if (!p) return []
  const rows = []
  const push = (title, raw) => {
    if (raw == null) return
    const s = String(raw).trim()
    if (s === '') return
    rows.push({ title, value: s })
  }
  // push('资料昵称', p.nickname)
  // push('真实姓名', p.realName)
  // push('身份证号', p.idCardNo)
  push('服务器名称', p.serverName)
  push('交易账户ID', p.tradingAccountId)
  push('交易所UID', p.exchangeUid)
  push('券商名称', p.walletName)
  push('钱包地址（TRC20）', p.walletAddress)
  if (p.principalAmount != null && String(p.principalAmount).trim() !== '') {
    const n = Number(p.principalAmount)
    const amount = Number.isFinite(n) ? formatMoney(n) : String(p.principalAmount).trim()
    rows.push({
      title: '底仓本金',
      value: `${amount} USD`,
    })
  }
  return rows
})

function referrerNick(u) {
  const n = u?.referrerNickname
  return n != null && String(n).trim() !== '' ? String(n) : '—'
}

const auth = useAuthStore()
const dashboard = useDashboardStore()
const { userInfo } = storeToRefs(auth)
const router = useRouter()

const loading = ref(true)
const logoutDialogShow = ref(false)

/** 带邀请码的完整注册页 URL，用于二维码与复制（仅审核通过用户展示） */
const inviteRegisterUrl = computed(() => {
  if (!auth.canShowInviteCode) return ''
  const code = String(userInfo.value?.invitationCode ?? '').trim()
  if (!code) return ''
  const { fullPath } = router.resolve({
    path: '/register',
    query: { invitationCode: code },
  })
  return `${window.location.origin}${fullPath}`
})

const inviteQrDataUrl = ref('')
const inviteQrLoading = ref(false)
const inviteQrFailed = ref(false)

watch(
  inviteRegisterUrl,
  async (url) => {
    if (!url) {
      inviteQrDataUrl.value = ''
      inviteQrLoading.value = false
      inviteQrFailed.value = false
      return
    }
    inviteQrLoading.value = true
    inviteQrDataUrl.value = ''
    inviteQrFailed.value = false
    try {
      inviteQrDataUrl.value = await QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      inviteQrDataUrl.value = ''
      inviteQrFailed.value = true
    } finally {
      inviteQrLoading.value = false
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!auth.isLogin) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    dashboard.fetchPendingSummary().catch(() => {})
  } catch {
    /* 保留本地已有 userInfo，避免整页空白 */
  } finally {
    loading.value = false
  }
})

async function copyInviteRegisterUrl() {
  const url = inviteRegisterUrl.value
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

function goToProfileComplete() {
  router.push('/me/profile-complete')
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
.invite-qr {
  margin: 0 16px 12px;
  padding: 16px 14px 14px;
  text-align: center;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}
.invite-qr__title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}
.invite-qr__canvas-wrap {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.invite-qr__img {
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}
.invite-qr__hint {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #969799;
}
.invite-qr__err {
  margin: 0;
  padding: 0 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #ee0a24;
}
.profile__admin,
.profile__edit,
.profile__block {
  margin-top: 12px;
}
.profile__complete-entry {
  margin-top: 12px;
  padding: 0 16px;
}
.profile__complete-entry__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.profile__logout {
  margin: 24px 16px 0;
}
.profile-invite-cell :deep(.van-cell__title),
.profile-invite-cell :deep(.van-cell__value) {
  color: #ee0a24;
  font-weight: 700;
}
</style>
