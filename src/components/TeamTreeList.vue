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
        <div class="team-tree-tags" @click.stop="ctx.openMember(node)">
          <van-tag :type="userStatusTagType(node.status)" plain round>
            {{ formatUserStatus(node.status) }}
          </van-tag>
          <van-tag
            v-if="hasQualificationStatus(node)"
            :type="qualificationStatusTagType(node.qualificationStatus)"
            plain
            round
            class="team-tree-tags__qual"
          >
            资格 {{ formatQualificationStatus(node.qualificationStatus) }}
          </van-tag>
        </div>
      </template>
      <template v-if="qualificationRejectRemarkLine(node)" #label>
        <span class="team-tree-qual-remark">{{ qualificationRejectRemarkLine(node) }}</span>
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
import {
  formatQualificationStatus,
  formatUserStatus,
  qualificationStatusTagType,
  userStatusTagType,
} from '@/utils/format'

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
  const m = node?.mobile
  if (m != null && String(m).trim() !== '') return String(m).trim()
  return '—'
}

function onCellClick(node, e) {
  if (e?.target?.closest?.('.team-tree-toggle')) return
  ctx.openMember(node)
}

function hasQualificationStatus(node) {
  const v = node?.qualificationStatus
  return v != null && String(v).trim() !== ''
}

function isQualificationRejected(st) {
  if (st === 3) return true
  if (typeof st === 'string' && st.trim().toUpperCase() === 'REJECTED') return true
  return false
}

function qualificationRejectRemarkLine(node) {
  if (!isQualificationRejected(node?.qualificationStatus)) return ''
  const r = node?.qualificationAuditRemark
  if (r == null || String(r).trim() === '') return ''
  return `审核备注：${String(r).trim()}`
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
.team-tree-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  max-width: 100%;
}
.team-tree-tags__qual {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.team-tree-qual-remark {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #646566;
  line-height: 1.45;
}
</style>
