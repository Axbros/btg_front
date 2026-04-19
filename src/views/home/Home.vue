<template>
  <div class="home home--v3">
    <div class="home-bg-layer" aria-hidden="true" />
    <section class="home-top-bg">
      <section class="home-hero" aria-label="品牌与服务">
        <header class="home__brand-bar">
          <div class="home__brand-top">
            <div class="home__brand-mark">
              <img class="home__brand-logo" :src="logoSrc" alt="" width="28" height="28" />
              <span class="home__brand-name">{{ siteTitle }}</span>
            </div>
            <van-icon
              name="service-o"
              class="home__cs-icon"
              aria-label="联系客服"
              role="button"
              tabindex="0"
              @click="openCustomerService"
              @keydown.enter.prevent="openCustomerService"
              @keydown.space.prevent="openCustomerService"
            />
          </div>
          <div class="home__search-row">
            <div class="home__search-pill" role="search">
              <div class="home__search-pill-main">
                <van-icon name="search" class="home__search-icon" />
                <span class="home__search-placeholder">搜索</span>
              </div>
              <button type="button" class="home__search-btn" aria-label="搜索" @click="onSearchClick">
                <van-icon name="search" class="home__search-btn-icon" />
              </button>
            </div>
          </div>
        </header>
      </section>
    </section>

    <section class="home-quick-wrap">
        <div class="quick-entry">
          <div v-if="!isRootUser" class="quick-entry-item" @click="goHomeNav('/profit-report/submit')">
            <div class="icon"><van-icon name="edit" /></div>
            <span class="text">利润上报</span>
          </div>
          <div v-if="!isRootUser" class="quick-entry-item" @click="goHomeNav('/profit-report/mine')">
            <div class="icon"><van-icon name="records" /></div>
            <span class="text">利润记录</span>
          </div>
          <div v-if="!isRootUser" class="quick-entry-item quick-entry-item--accent" @click="goHomeNav({ name: 'ReplenishmentMine' })">
            <div class="icon"><van-icon name="gold-coin-o" /></div>
            <span class="text">补仓</span>
          </div>
          <div v-if="!isRootUser" class="quick-entry-item" @click="goHomeNav({ name: 'RepayMine' })">
            <div class="icon"><van-icon name="balance-list-o" /></div>
            <span class="text">归仓</span>
          </div>

          <div class="quick-entry-item" @click="goHomeNav({ name: 'AccountSummary' })">
            <div class="icon"><van-icon name="balance-pay" /></div>
            <span class="text">分润汇总</span>
          </div>

          <div class="quick-entry-item" @click="goHomeNav({ name: 'Mt5Snapshot' })">
            <div class="icon"><van-icon name="exchange" /></div>
            <span class="text">MT5</span>
          </div>
          <div class="quick-entry-item" @click="goHomeNav('/team/descendants')">
            <div class="icon"><van-icon name="friends-o" /></div>
            <span class="text">团队</span>
          </div>

          
        </div>
    </section>

    <section class="home-body">
      <HomeProfitTrendCard class="chart-card home__profit-trend" />

      <footer class="home__footer">
        <p class="home__copyright">{{ copyrightText }}</p>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { fetchMe } from '@/api/user'
import { isUserRoot } from '@/utils/permission'
import HomeProfitTrendCard from '@/components/home/HomeProfitTrendCard.vue'

/** 客服外链（仅展示跳转，后续可改配置） */
const CUSTOMER_SERVICE_URL = 'https://t.me/Wimmmmmer'

const siteTitle = import.meta.env.VITE_APP_TITLE || '吞金授'

const base = import.meta.env.BASE_URL || '/'
const logoSrc = computed(() => (base.endsWith('/') ? `${base}icon.svg` : `${base}/icon.svg`))

const router = useRouter()
const auth = useAuthStore()
const dashboard = useDashboardStore()
const { userInfo } = storeToRefs(auth)

const isRootUser = computed(() => isUserRoot(userInfo.value))

const copyrightText = computed(() => {
  const custom = import.meta.env.VITE_APP_COPYRIGHT
  if (custom != null && String(custom).trim() !== '') return String(custom).trim()
  const y = new Date().getFullYear()
  return `© ${y} ${siteTitle} 版权所有`
})

function openCustomerService() {
  const url = String(CUSTOMER_SERVICE_URL || '').trim()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function onSearchClick() {
  showToast('敬请期待')
}

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
  try {
    const me = await fetchMe()
    auth.setUserInfo(me)
    if (Number(me?.status) === -1 || Number(me?.status) === 0) {
      router.replace('/me/profile-complete')
      return
    }
  } catch {
    /* 失败时保留本地已有 userInfo */
  }
  await dashboard.fetchPendingSummary().catch(() => {})
})
</script>

<style lang="scss" scoped>
.home {
  /* 首页白卡体系统一：主面与内嵌统计区（与图表卡同色体系） */
  --home-card-surface: #ffffff;
  --home-card-inner: #f5f6f8;

  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  background: #f5f7fa;
}

.home-bg-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 260px;
  background: linear-gradient(180deg, #1357f0 0%, #1f6fff 40%, #3d86ff 70%, #6aa8ff 100%);
  border-radius: 0 0 50% 50% / 12%;
  z-index: 0;
  pointer-events: none;
}

.home-top-bg {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  padding: 0 16px;
}

.home-hero {
  position: relative;
  box-sizing: border-box;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
  padding-bottom: 24px;
}

.home__brand-bar {
  position: relative;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  box-sizing: border-box;
}

.home__brand-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.home__search-row {
  width: 100%;
  box-sizing: border-box;
}

.home__brand-mark {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.home__brand-logo {
  flex-shrink: 0;
  display: block;
  border-radius: 8px;
}

.home__brand-name {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 30, 90, 0.2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home__cs-icon {
  flex-shrink: 0;
  padding: 8px;
  margin: -8px -8px -8px 0;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.home__cs-icon:active {
  opacity: 0.85;
}

.home__search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 42px;
  padding: 4px 4px 4px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.65);
}

.home__search-pill-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.home__search-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #1a5cff;
  color: #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.home__search-btn:active {
  opacity: 0.92;
  transform: scale(0.97);
}

.home__search-btn-icon {
  font-size: 16px;
  color: #fff;
}

.home-quick-wrap {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 100%;
  max-width: 520px;
  margin: 8px auto 0;
  padding: 0 16px 8px;
  box-sizing: border-box;
}

.home__search-icon {
  font-size: 18px;
  color: #6b7a90;
  flex-shrink: 0;
}

.home__search-placeholder {
  font-size: 14px;
  color: #b0b8c6;
  letter-spacing: 0.02em;
}

.home-body {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  padding: 12px 16px 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  max-width: 520px;
  width: 100%;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  gap: 14px;
  background: #f5f7fa;
}

.quick-entry {
  flex-shrink: 0;
  background-color: var(--home-card-surface);
  border-radius: 22px;
  padding: 18px 14px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  overflow: hidden;
  isolation: isolate;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.quick-entry-item {
  background-color: var(--home-card-surface);
  border-radius: 16px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.quick-entry-item:active {
  transform: scale(0.98);
  opacity: 0.92;
}

.quick-entry-item .icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  background: linear-gradient(180deg, #eef4ff 0%, #f7faff 100%);
  color: #1a5cff;
  font-size: 22px;
}

.quick-entry-item--accent .icon {
  background: linear-gradient(180deg, #fff0e5 0%, #fffaf6 100%);
  color: var(--app-accent-warm, #ff8f3c);
}

.quick-entry-item .text {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin-top: 4px;
  text-align: center;
  line-height: 1.25;
  padding: 0 2px;
}

/** 图表区随内容增高，整页由 .home 纵向滚动（适配小屏 + lockViewport） */
.chart-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.home__profit-trend {
  margin-top: 0;
}

.home__footer {
  flex-shrink: 0;
  margin-top: 4px;
  padding: 8px 4px 8px;
  text-align: center;
}

.home__copyright {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--app-text-tertiary, #969799);
  opacity: 0.9;
}
</style>
