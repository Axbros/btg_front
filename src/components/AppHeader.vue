<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    fixed
    placeholder
    @click-left="onBack"
  />
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
})

const router = useRouter()

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/home')
}
</script>
