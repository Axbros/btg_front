<template>
  <van-empty :image="image" :description="description">
    <slot />
  </van-empty>
</template>

<script setup>
defineProps({
  description: { type: String, default: '暂无数据' },
  image: { type: String, default: 'default' },
})
</script>
