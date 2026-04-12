<template>
  <template v-for="node in nodes" :key="node.id">
    <van-cell class="team-tree-cell" @click="onCellClick(node, $event)">
      <template #title>
        <div class="team-tree-row" :style="{ paddingLeft: `${depth * 14}px` }">
          <button
            v-if="hasChildren(node)"
            type="button"
            class="team-tree-toggle"
            :aria-expanded="ctx.isExpanded(node.id)"
            aria-label="展开或收起下级"
            @click.stop="ctx.toggleExpand(node.id)"
          >
            <van-icon :name="ctx.isExpanded(node.id) ? 'arrow-down' : 'arrow'" class="team-tree-toggle__icon" />
          </button>
          <span v-else class="team-tree-toggle team-tree-toggle--spacer" aria-hidden="true" />
          <span class="team-tree-name">{{ nodeTitle(node) }}</span>
        </div>
      </template>
      <template #value>
        <van-tag :type="userStatusTagType(node.status)" plain round @click.stop="ctx.openMember(node)">
          {{ formatUserStatus(node.status) }}
        </van-tag>
      </template>
    </van-cell>
    <TeamTreeList
      v-if="hasChildren(node) && ctx.isExpanded(node.id)"
      :nodes="node.children"
      :depth="depth + 1"
    />
  </template>
</template>

<script setup>
import { inject } from 'vue'
import { formatUserStatus, userStatusTagType } from '@/utils/format'

defineOptions({ name: 'TeamTreeList' })

defineProps({
  nodes: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
})

const ctx = inject('teamTreeCtx')

function hasChildren(node) {
  const ch = node?.children
  return Array.isArray(ch) && ch.length > 0
}

function nodeTitle(node) {
  const n = node?.nickname ?? node?.nickName
  if (n != null && String(n).trim() !== '') return String(n).trim()
  return '—'
}

function onCellClick(node, e) {
  if (e?.target?.closest?.('.team-tree-toggle')) return
  ctx.openMember(node)
}
</script>

<style scoped>
.team-tree-cell :deep(.van-cell__title) {
  flex: 1;
  min-width: 0;
}
.team-tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.team-tree-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -4px 0 -4px -6px;
  padding: 0;
  border: none;
  background: transparent;
  color: #969799;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.team-tree-toggle--spacer {
  pointer-events: none;
  visibility: hidden;
}
.team-tree-toggle__icon {
  font-size: 14px;
}
.team-tree-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
