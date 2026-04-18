<template>
  <template v-for="(node, idx) in nodes" :key="node.id">
    <van-cell
      class="team-tree-cell"
      :style="{ paddingLeft: `${depth * 14}px` }"
      :label="nodeMobile(node) || undefined"
      :border="true"
      @click="onCellClick(node, $event)"
    >
      <template #title>
        <div class="team-tree-title">
          <span class="team-tree-index" :class="{ 'team-tree-index--nested': pathPrefix }">{{ nodeIndexLabel(idx) }}</span>
          <span class="team-tree-name">{{ nodeNickname(node) }}</span>
        </div>
      </template>
      <template #icon>
        <div class="team-tree-icon-wrap">
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
        </div>
      </template>
      <template #value>
        <van-tag
          :type="qualificationStatusTagType(nodeQualDisplay(node))"
          plain
          round
          class="team-tree-qual-tag"
        >
          {{ formatQualificationStatus(nodeQualDisplay(node)) }}
        </van-tag>
      </template>
    </van-cell>
    <TeamTreeList
      v-if="hasChildren(node) && ctx.isExpanded(node.id)"
      :nodes="node.children"
      :depth="depth + 1"
      :path-prefix="nodeIndexLabel(idx)"
    />
  </template>
</template>

<script setup>
import { inject } from 'vue'
import { formatQualificationStatus, qualificationStatusTagType } from '@/utils/format'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'

defineOptions({ name: 'TeamTreeList' })

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
  /** 上级序号，如 `"1"`；根级留空则本层为 `1`、`2`… */
  pathPrefix: { type: String, default: '' },
})

const ctx = inject('teamTreeCtx')

function nodeIndexLabel(indexInSiblings) {
  const n = indexInSiblings + 1
  if (!props.pathPrefix) return String(n)+"."
  return `${props.pathPrefix}.${n}`
}

function hasChildren(node) {
  const ch = node?.children
  return Array.isArray(ch) && ch.length > 0
}

function nodeNickname(node) {
  const n = node?.nickname ?? node?.nickName
  if (n != null && String(n).trim() !== '') return String(n).trim()
  return '—'
}

function nodeMobile(node) {
  const m = node?.mobile
  if (m == null || String(m).trim() === '') return ''
  return String(m).trim()
}

function onCellClick(node, e) {
  if (e?.target?.closest?.('.team-tree-toggle')) return
  ctx.openMember(node)
}

function nodeQualDisplay(node) {
  return effectiveQualificationStatusForDisplay(node)
}
</script>

<style scoped>
.team-tree-cell :deep(.van-cell__title) {
  flex: 1;
  min-width: 0;
}
.team-tree-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.team-tree-index {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1989fa;
}
.team-tree-index--nested {
  font-size: 13px;
  font-weight: 500;
  color: #646566;
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
.team-tree-icon-wrap {
  display: flex;
  align-items: center;
  margin-right: 4px;
  min-height: 24px;
}
.team-tree-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -4px 0;
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
.team-tree-qual-tag {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
