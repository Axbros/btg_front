<template>
  <div :class="['page-shell', hideTab ? 'no-tab' : '', lockViewport ? 'page-shell--fill' : '']">
    <div class="page-shell__view">
      <router-view />
    </div>
    <van-tabbar v-if="!hideTab" route placeholder safe-area-inset-bottom>
      <van-tabbar-item replace to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item replace to="/team/descendants" icon="friends-o">团队</van-tabbar-item>
      <van-tabbar-item replace to="/todo" icon="orders-o" :badge="todoTabBadge">待办</van-tabbar-item>
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
/** 禁止整页滚动（避免内容滑到固定导航栏下），由 App.vue 中 .page-shell--fill 实现 */
const lockViewport = computed(() => route.meta.lockViewport === true)

/** 待办 Tab 角标：与 dashboard 汇总一致 */
const todoTabBadge = computed(() => {
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
