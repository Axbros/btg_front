<template>
  <div :class="['page-shell', hideTab ? 'no-tab' : '']">
    <router-view />
    <van-tabbar v-if="!hideTab" route placeholder safe-area-inset-bottom>
      <van-tabbar-item replace to="/home" icon="home-o" :badge="homeTabBadge">首页</van-tabbar-item>
      <van-tabbar-item replace to="/team/descendants" icon="friends-o">团队</van-tabbar-item>
      <!-- <van-tabbar-item replace to="/profit-report/submit" icon="edit">上报</van-tabbar-item> -->
      <van-tabbar-item replace to="/me/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const route = useRoute()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const { totalPendingCount } = storeToRefs(dashboard)

const hideTab = computed(() => route.meta.hideTab === true)

/** 与首页九宫格徽标一致：仅在有待办时显示，>99 为 99+ */
const homeTabBadge = computed(() => {
  const v = Number(totalPendingCount.value) || 0
  if (v <= 0) return undefined
  return v > 99 ? '99+' : v
})

onMounted(() => {
  if (auth.isLogin) {
    dashboard.fetchPendingSummary().catch(() => {})
  }
})
</script>
