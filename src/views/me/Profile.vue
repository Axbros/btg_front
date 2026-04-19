<template>
  <div class="profile-hub">
    <AppHeader title="我的信息" :show-back="false" />
    <van-loading v-if="loading && !userInfo" class="profile-hub__loading" vertical>加载个人信息…</van-loading>
    <template v-else-if="userInfo">
      <div
        class="profile-hub__card"
        role="button"
        tabindex="0"
        @click="goAccount"
        @keydown.enter.prevent="goAccount"
      >
        <div class="profile-hub__avatar" aria-hidden="true">{{ avatarLetter }}</div>
        <div class="profile-hub__card-main">
          <div class="profile-hub__name">{{ displayName }}</div>
          <div class="profile-hub__sub">手机号 {{ mobileMasked }}</div>
        </div>
        <van-icon name="arrow" class="profile-hub__chevron" />
      </div>

      <van-cell-group v-if="menuGroup1.length" inset class="profile-hub__group">
        <van-cell
          v-for="item in menuGroup1"
          :key="item.name"
          :title="item.title"
          is-link
          :to="item.to"
        >
          <template #icon>
            <div class="profile-hub__ico" :class="item.iconClass">
              <van-icon :name="item.icon" />
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="profile-hub__group">
        <van-cell title="更新资料" is-link :to="{ name: 'ProfileComplete' }">
          <template #icon>
            <div class="profile-hub__ico profile-hub__ico--teal">
              <van-icon name="edit" />
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="profile-hub__logout">
        <van-button block round type="danger" plain @click="onLogout">退出登录</van-button>
      </div>
    </template>
    <EmptyState v-else description="未获取到用户信息" />

    <van-dialog v-model:show="logoutDialogShow" title="确认退出？" show-cancel-button @confirm="onLogoutConfirm" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useProfileCore } from '@/composables/useProfileCore'

function maskMobile(m) {
  const s = String(m ?? '').trim()
  if (!s) return '—'
  if (s.length < 7) return s
  return `${s.slice(0, 3)}****${s.slice(-4)}`
}

const router = useRouter()
const {
  auth,
  userInfo,
  reloadProfile,
  qualificationSectionVisible,
  profileDetailRows,
} = useProfileCore()

const loading = ref(true)
const logoutDialogShow = ref(false)

const displayName = computed(() => {
  const n = userInfo.value?.nickname
  if (n != null && String(n).trim() !== '') return String(n).trim()
  const m = userInfo.value?.mobile
  if (m != null && String(m).trim() !== '') return String(m).trim()
  return '用户'
})

const mobileMasked = computed(() => maskMobile(userInfo.value?.mobile))

const avatarLetter = computed(() => {
  const name = displayName.value
  const ch = name.charAt(0)
  return ch || '?'
})

const menuGroup1 = computed(() => {
  const items = []
  if (auth.canShowInviteCode) {
    items.push({
      name: 'invite',
      title: '邀请注册',
      to: { name: 'ProfileInvite' },
      icon: 'qr',
      iconClass: 'profile-hub__ico--green',
    })
  }
  if (qualificationSectionVisible.value) {
    items.push({
      name: 'qual',
      title: '资格审核',
      to: { name: 'ProfileQualification' },
      icon: 'passed',
      iconClass: 'profile-hub__ico--orange',
    })
  }
  if (profileDetailRows.value.length) {
    items.push({
      name: 'materials',
      title: '交易资料',
      to: { name: 'ProfileMaterials' },
      icon: 'description',
      iconClass: 'profile-hub__ico--blue',
    })
  }
  return items
})

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

function goAccount() {
  router.push({ name: 'ProfileAccount' })
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
.profile-hub__loading {
  padding: 48px 0;
}
.profile-hub__card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 12px 16px 10px;
  padding: 16px 14px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}
.profile-hub__card:active {
  opacity: 0.92;
}
.profile-hub__avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(135deg, #07c160 0%, #0aad74 100%);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-hub__card-main {
  flex: 1;
  min-width: 0;
}
.profile-hub__name {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-hub__sub {
  margin-top: 6px;
  font-size: 13px;
  color: #969799;
  line-height: 1.4;
}
.profile-hub__chevron {
  flex-shrink: 0;
  color: #c8c9cc;
  font-size: 16px;
}
.profile-hub__group {
  margin-top: 10px;
}
.profile-hub__ico {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  margin-right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}
.profile-hub__ico--green {
  background: linear-gradient(135deg, #07c160, #10ad7a);
}
.profile-hub__ico--orange {
  background: linear-gradient(135deg, #ff976a, #ff6034);
}
.profile-hub__ico--blue {
  background: linear-gradient(135deg, #1989fa, #0570de);
}
.profile-hub__ico--teal {
  background: linear-gradient(135deg, #00c9a7, #00a896);
}
.profile-hub__logout {
  margin: 24px 16px 16px;
}
</style>
