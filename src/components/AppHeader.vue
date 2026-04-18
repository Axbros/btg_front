<template>
  <van-nav-bar
    :title="showLogo ? '' : title"
    :left-arrow="showBack"
    fixed
    placeholder
    @click-left="onBack"
  >
    <template v-if="showLogo" #title>
      <span class="app-header__title">
        <img class="app-header__logo" :src="logoSrc" alt="" width="22" height="22" />
        <span class="app-header__title-text">{{ title }}</span>
      </span>
    </template>
    <template v-if="slots.right" #right>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<script setup>
import { useSlots } from 'vue'
import { useRouter } from 'vue-router'

const slots = useSlots()

defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
  /** 仅首页等场景：标题旁展示 public/icon.svg */
  showLogo: { type: Boolean, default: false },
})

/** public/icon.svg，兼容 Vite base 子路径 */
const base = import.meta.env.BASE_URL || '/'
const logoSrc = base.endsWith('/') ? `${base}icon.svg` : `${base}/icon.svg`

const router = useRouter()

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/home')
}
</script>

<style scoped>
.app-header__title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: min(100%, 72vw);
}
.app-header__logo {
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}
.app-header__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
