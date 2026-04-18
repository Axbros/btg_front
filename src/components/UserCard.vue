<template>
  <div class="user-card">
    <div class="user-card__main">
      <div class="user-card__name">{{ displayName }}</div>
      <div class="user-card__sub">{{ sub }}</div>
    </div>
    <div v-if="$slots.extra" class="user-card__extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: { type: Object, default: null },
  sub: { type: String, default: '' },
})

/** 首页等场景：用户-{nickname}，无真实姓名则用手机号或 ID */
const displayName = computed(() => {
  const u = props.user
  if (!u) return '—'
  const nick = u.nickname || u.nickName
  if (nick) return `用户-${nick}`
  const phone = u.mobile || u.phone
  if (phone) return `用户-${phone}`
  return `用户-${pickId(u)}`
})

function pickId(u) {
  return u.id ?? u.userId ?? '—'
}
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  color: #fff;
  /* 主渐变 + 顶部高光，整体为渐变背景 */
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(
      128deg,
      #0d62c9 0%,
      #1989fa 36%,
      #3d9dfe 68%,
      #5ec8ff 100%
    );
}
.user-card__main {
  min-width: 0;
}
.user-card__name {
  font-size: 17px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-card__sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.9;
}
.user-card__extra {
  flex-shrink: 0;
}
</style>
