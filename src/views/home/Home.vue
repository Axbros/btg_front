<template>
  <div class="home">
    <div class="home__hero">
      <div class="home__welcome">工作台</div>
      <UserCard v-if="!heroLoading && userInfo" :user="userInfo" :sub="heroSub" />
      <UserCard v-else :user="null" :sub="heroPlaceholder" />
    </div>

    <van-grid :column-num="2" :gutter="10" class="home__grid" clickable>
      <!-- <van-grid-item icon="friends-o" text="我的直属下级" to="/team/direct" /> -->
      <van-grid-item icon="cluster-o" text="我的全部下级" to="/team/descendants" />
      <!-- <van-grid-item icon="edit" text="利润上报" to="/profit-report/submit" /> -->
      <van-grid-item icon="records" text="我的利润上报记录" to="/profit-report/mine" />
      <van-grid-item icon="balance-pay" text="待支付给上级" to="/settlement/pending-pay" />
      <van-grid-item icon="passed" text="待审核下级结算" to="/settlement/pending-review" />
      <van-grid-item icon="balance-o" text="账户汇总" to="/me/account" />
      <van-grid-item icon="chart-trending-o" text="团队统计" to="/me/team-stats" />
      <van-grid-item icon="gold-coin-o" text="补仓与归仓" to="/replenishment" />
    </van-grid>

    <van-cell-group v-if="auth.isAdmin" inset title="管理员" class="home__admin">
      <van-cell title="待审核收益" is-link to="/admin/pending" />
      <van-cell title="待审核补仓" is-link to="/admin/replenishments/pending" />
      <van-cell title="待审核归仓" is-link to="/admin/replenishments/repays/pending" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { fetchMe } from '@/api/user'
import UserCard from '@/components/UserCard.vue'

const auth = useAuthStore()
const { userInfo } = storeToRefs(auth)

const heroLoading = ref(false)

const heroSub = computed(() => {
  const u = userInfo.value
  if (!u) return ''
  const phone = u.mobile || u.phone || ''
  return [phone && `手机 ${phone}`].filter(Boolean).join(' · ')
})

const heroPlaceholder = computed(() => {
  if (heroLoading.value) return '加载用户信息…'
  return '暂无法获取用户信息，请稍后重试'
})

onMounted(async () => {
  if (!auth.isLogin) return
  heroLoading.value = true
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
  } catch {
    /* 失败时保留本地已有 userInfo */
  } finally {
    heroLoading.value = false
  }
})
</script>

<style scoped>
.home {
  padding: 12px 0 8px;
}
.home__hero {
  padding: 0 12px 8px;
}
.home__welcome {
  font-size: 15px;
  color: #646566;
  margin-bottom: 10px;
  padding-left: 4px;
}
.home__grid {
  margin-top: 4px;
}
.home__admin,
.home__links {
  margin-top: 12px;
}
</style>
