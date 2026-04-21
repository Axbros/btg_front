<template>
  <div class="qual-pending">
    <AppHeader title="等待审核" />
    <van-loading v-if="loading" class="qual-pending__loading" vertical>加载中…</van-loading>
    <template v-else>
      <van-empty image="default" :description="''">
        <template #description>
          <p class="qual-pending__title">资料已提交</p>
          <p class="qual-pending__text">请等待系统管理员审核</p>
        </template>
      </van-empty>

      <van-cell-group inset title="当前状态" class="qual-pending__cells">
        <van-cell title="资格审核">
          <template #value>
            <van-tag :type="qualificationStatusTagType(qualStatus)" plain round>
              {{ formatQualificationStatus(qualStatus) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell v-if="remarkPresent" title="审核备注" :label="remarkText" />
      </van-cell-group>

      <div class="qual-pending__actions">
        <van-button round block type="primary" @click="goEditProfile">编辑资料</van-button>
        <van-button round block plain type="danger" @click="onLogout">退出登录</van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { showConfirmDialog } from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'
import { fetchMe } from '@/api/user'
import {
  formatQualificationStatus,
  qualificationStatusTagType,
} from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const loading = ref(true)

const profileBlock = computed(() => {
  const p = userInfo.value?.profile
  if (!p || typeof p !== 'object') return null
  return p
})

const qualStatus = computed(() => effectiveQualificationStatusForDisplay(userInfo.value))

const remarkText = computed(() => {
  const r = profileBlock.value?.qualificationAuditRemark
  if (r == null) return ''
  const s = String(r).trim()
  return s
})

const remarkPresent = computed(() => remarkText.value !== '')

function goEditProfile() {
  router.push({ name: 'ProfileComplete' })
}

async function onLogout() {
  try {
    await showConfirmDialog({ title: '确认退出登录？' })
    auth.logout()
    router.replace('/login')
  } catch {
    /* 取消 */
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    if (auth.isQualificationApproved && Number(auth.userInfo?.status) === 1) {
      router.replace('/home')
    }
  } catch {
    if (auth.isQualificationApproved && Number(auth.userInfo?.status) === 1) {
      router.replace('/home')
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.qual-pending {
  padding-bottom: 24px;
}
.qual-pending__loading {
  padding: 48px 0;
}
.qual-pending__title {
  margin: 0 16px 8px;
  font-size: 17px;
  font-weight: 600;
  color: #323233;
  line-height: 1.4;
}
.qual-pending__text {
  margin: 0 20px;
  font-size: 14px;
  color: #646566;
  line-height: 1.55;
}
.qual-pending__cells {
  margin-top: 8px;
}
.qual-pending__actions {
  margin: 24px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
