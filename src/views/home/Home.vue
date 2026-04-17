<template>
  <div class="home">
    <AppHeader :title="siteTitle" :show-back="false" show-logo />
    <van-notice-bar
      class="home__notice"
      left-icon="volume-o"
      text="🔥吞金授目前正持续火热盈利中，推广福利多多，佣金多多，欢迎加入！"
    />

    <div class="home__hero">
      <van-swipe
        class="home__ads"
        :autoplay="4000"
        circular
        lazy-render
        indicator-color="#fff"
      >
      
        <van-swipe-item v-for="(ad, i) in adBanners" :key="i">
          <img class="home__ad-img" :src="ad.src" :alt="ad.alt" width="750" height="280" loading="lazy" />
        </van-swipe-item>
      </van-swipe>
    </div>

    <van-grid :column-num="2" :gutter="10" class="home__grid" clickable>
      <!-- <van-grid-item icon="cluster-o" text="我的全部下级" @click="goHomeNav('/team/descendants')" /> -->
      <van-grid-item
        v-if="!isRootUser"
        icon="edit"
        text="利润上报"
        @click="goHomeNav('/profit-report/submit')"
      />
      <van-grid-item
        v-if="!isRootUser"
        icon="records"
        text="我的利润上报记录"
        @click="goHomeNav('/profit-report/mine')"
      />
      <van-grid-item icon="balance-o" text="分润汇总" @click="goHomeNav('/me/account')" />
      <van-grid-item
        v-if="!isRootUser"
        icon="chart-trending-o"
        text="团队统计"
        @click="goHomeNav('/me/team-stats')"
      />
      <van-grid-item
        v-if="!isRootUser"
        icon="gold-coin-o"
        text="补仓"
        @click="goHomeNav('/replenishment')"
      />
      <van-grid-item
        v-if="!isRootUser"
        icon="balance-list-o"
        text="归仓"
        @click="goHomeNav('/repay')"
      />
      <van-grid-item
        v-if="!isRootUser"
        icon="records"
        text="我的归仓申请"
        @click="goHomeNav({ name: 'RepayMine' })"
      />
      <van-grid-item
        v-if="!isRootUser"
        icon="passed"
        text="待我审核的归仓"
        @click="goHomeNav({ name: 'RepayPendingReview' })"
      />
      <van-grid-item icon="friends-o" text="下级补仓记录" @click="goHomeNav('/team/sub-replenishments')" />
      <van-grid-item icon="orders-o" text="下级归仓记录" @click="goHomeNav('/team/sub-repays')" />
      <van-grid-item
        v-if="isRootUser"
        icon="gold-coin-o"
        text="待审核补仓"
        @click="goHomeNav('/admin/replenishments/pending')"
        :badge="replenishmentAdminMenuBadge"
      />
      <van-grid-item
        v-if="isRootUser"
        icon="balance-list-o"
        text="待审核归仓"
        @click="goHomeNav('/admin/replenishments/repays/pending')"
        :badge="repayAdminMenuBadge"
      />
      <van-grid-item
        v-if="isRootUser"
        icon="passed"
        text="待审核资格"
        @click="goHomeNav({ name: 'AdminUserQualificationPending' })"
      />
    </van-grid>

    <van-cell-group v-if="isRootUser" inset title="管理" class="home__root-tools">
      <van-cell title="待审核资格" is-link @click="goHomeNav({ name: 'AdminUserQualificationPending' })" />
    </van-cell-group>

    <van-cell-group v-if="auth.isAdmin && !isRootUser" inset title="管理员" class="home__admin">
      <!-- <van-cell is-link to="/admin/pending">
        <template #title>
          <span class="home__menu-title">
            <span>待审核收益</span>
            <van-badge v-if="profitReviewBadge > 0" :content="profitReviewBadge" max="99" />
          </span>
        </template>
      </van-cell> -->
      <van-cell is-link @click="goHomeNav('/admin/replenishments/pending')">
        <template #title>
          <span class="home__menu-title">
            <span>待审核补仓</span>
            <van-badge v-if="replenishmentReviewBadge > 0" :content="replenishmentReviewBadge" max="99" />
          </span>
        </template>
      </van-cell>
      <van-cell is-link @click="goHomeNav('/admin/replenishments/repays/pending')">
        <template #title>
          <span class="home__menu-title">
            <span>待审核归仓</span>
            <van-badge v-if="repayReviewBadge > 0" :content="repayReviewBadge" max="99" />
          </span>
        </template>
      </van-cell>
    </van-cell-group>

    <footer class="home__footer">
      <p class="home__copyright">{{ copyrightText }}</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { fetchMe } from '@/api/user'
import { isUserRoot } from '@/utils/permission'
import AppHeader from '@/components/AppHeader.vue'

/** 与 index.html 标题一致；可在 .env 中配置 VITE_APP_TITLE 覆盖 */
const siteTitle = import.meta.env.VITE_APP_TITLE || '吞金授'

const base = import.meta.env.BASE_URL || '/'
const publicPath = (file) => (base.endsWith('/') ? `${base}${file}` : `${base}/${file}`)

/** 首页轮播广告：替换 public/banners/ad-*.svg 或改为 .jpg 等 */
const adBanners = [
  { src: publicPath('banners/ad-1.svg'), alt: '广告 1' },
  { src: publicPath('banners/ad-2.svg'), alt: '广告 2' },
  { src: publicPath('banners/ad-3.svg'), alt: '广告 3' },
]

const router = useRouter()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const { userInfo } = storeToRefs(auth)
const { pendingSummary } = storeToRefs(dashboard)

const heroLoading = ref(false)

const isRootUser = computed(() => isUserRoot(userInfo.value))

/** 仅数量 > 0 时传给 van-grid-item / van-badge，避免显示 0 */
function countBadge(n) {
  const v = Number(n) || 0
  return v > 0 ? (v > 99 ? '99+' : v) : undefined
}

const profitReviewBadge = computed(
  () => Number(pendingSummary.value?.pendingProfitReportReviewCount) || 0,
)
const replenishmentReviewBadge = computed(
  () => Number(pendingSummary.value?.pendingReplenishmentReviewCount) || 0,
)
const repayReviewBadge = computed(
  () => Number(pendingSummary.value?.pendingReplenishmentRepayReviewCount) || 0,
)

/** 根用户首页九宫格角标（与管理员 cell 区数据源一致） */
const replenishmentAdminMenuBadge = computed(() =>
  countBadge(pendingSummary.value?.pendingReplenishmentReviewCount),
)
const repayAdminMenuBadge = computed(() =>
  countBadge(pendingSummary.value?.pendingReplenishmentRepayReviewCount),
)

const copyrightText = computed(() => {
  const custom = import.meta.env.VITE_APP_COPYRIGHT
  if (custom != null && String(custom).trim() !== '') return String(custom).trim()
  const y = new Date().getFullYear()
  return `© ${y} ${siteTitle} 版权所有`
})

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

function goHomeNav(to) {
  if (auth.isRestrictedToProfileComplete) {
    showToast('请先完成资料流程')
    router.replace('/me/profile-complete')
    return
  }
  router.push(to)
}

onMounted(async () => {
  if (!auth.isLogin) return
  heroLoading.value = true
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    if (Number(me?.status) === -1 || Number(me?.status) === 0) {
      router.replace('/me/profile-complete')
      return
    }
  } catch {
    /* 失败时保留本地已有 userInfo */
  } finally {
    heroLoading.value = false
  }
  await dashboard.fetchPendingSummary().catch(() => {})
})
</script>

<style scoped>
.home {
  padding: 0 0 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
}
/* 紧贴固定 AppHeader 占位底边，避免页面级 padding 顶出缝隙 */
.home__notice {
  margin: 0;
}
.home__hero {
  padding: 0 12px 8px;
}
.home__ads {
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  aspect-ratio: 750 / 280;
}
.home__ads :deep(.van-swipe__track) {
  height: 100%;
}
.home__ads :deep(.van-swipe-item) {
  height: 100%;
  line-height: 0;
}
.home__ads :deep(.van-swipe__indicator--active) {
  width: 14px;
  border-radius: 3px;
}
.home__ad-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.home__menu-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.home__root-tools {
  margin-top: 12px;
}
.home__admin,
.home__links {
  margin-top: 12px;
}
.home__footer {
  margin-top: 28px;
  padding: 0 20px 12px;
  text-align: center;
}
.home__copyright {
  margin: 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
}
</style>
