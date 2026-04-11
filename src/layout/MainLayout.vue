<template>
  <div :class="['page-shell', hideTab ? 'no-tab' : '']">
    <router-view />
    <van-tabbar v-if="!hideTab" route placeholder safe-area-inset-bottom>
      <van-tabbar-item replace to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item replace to="/team/direct" icon="friends-o">团队</van-tabbar-item>
      <van-tabbar-item replace to="/profit/submit" icon="edit">申报</van-tabbar-item>
      <van-tabbar-item replace to="/me/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const hideTab = computed(() => route.meta.hideTab === true)
</script>
