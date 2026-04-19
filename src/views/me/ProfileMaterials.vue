<template>
  <div>
    <AppHeader title="交易资料" />
    <van-loading v-if="loading && !userInfo" class="profile-sub__loading" vertical>加载中…</van-loading>
    <div v-else-if="userInfo && profileDetailRows.length" class="profile-sub">
      <van-cell-group inset>
        <van-cell v-for="(row, idx) in profileDetailRows" :key="idx" :title="row.title" :value="row.value" />
      </van-cell-group>
    </div>
    <EmptyState v-else-if="userInfo" description="暂无已填写的交易资料" />
    <EmptyState v-else description="未获取到用户信息" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useProfileCore } from '@/composables/useProfileCore'

const { auth, userInfo, reloadProfile, profileDetailRows } = useProfileCore()

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
</script>

<style scoped>
.profile-sub__loading {
  padding: 48px 0;
}
.profile-sub {
  margin-top: 12px;
  padding-bottom: 24px;
}
</style>
