<template>
  <van-tag :type="tagType" plain>{{ text }}</van-tag>
</template>

<script setup>
import { computed } from 'vue'
import { formatStrategyStatus } from '@/utils/format'

const props = defineProps({
  status: { type: [String, Number, Boolean], default: '' },
})

const text = computed(() => formatStrategyStatus(props.status))

const tagType = computed(() => {
  const v = props.status
  if (v === 1 || v === '1' || v === true) return 'success'
  if (v === 0 || v === '0' || v === false) return 'default'
  const s = String(v || '').toUpperCase()
  if (s === 'ENABLED' || s === 'ACTIVE') return 'success'
  if (s === 'DISABLED' || s === 'INACTIVE') return 'default'
  return 'primary'
})
</script>
