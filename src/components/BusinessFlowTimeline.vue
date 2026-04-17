<template>
  <div class="flow-timeline">
    <van-empty v-if="!sortedNodes.length" :description="emptyDescription" />
    <van-steps v-else direction="vertical" :active="timelineActiveIndex" class="flow-timeline__steps">
      <van-step v-for="(node, index) in sortedNodes" :key="stableTimelineNodeKey(node, index)">
        <div class="flow-node">
          <div class="flow-node__title">{{ nodeTitle(node) }}</div>
          <div v-if="nodeRole(node)" class="flow-node__line">角色：{{ formatNodeRole(nodeRole(node)) }}</div>
          <div v-if="nodeAction(node)" class="flow-node__line">动作：{{ formatNodeAction(nodeAction(node)) }}</div>
          <div v-if="nodeDisplayStatus(node)" class="flow-node__line">
            状态：{{ formatFlowNodeDisplayStatus(nodeDisplayStatus(node)) }}
          </div>
          <div v-if="operatorLine(node)" class="flow-node__line">{{ operatorLine(node) }}</div>
          <div v-if="versionLine(node)" class="flow-node__line">{{ versionLine(node) }}</div>
          <div v-if="nodeRemark(node)" class="flow-node__remark">{{ nodeRemark(node) }}</div>
          <div v-if="nodeTime(node)" class="flow-node__time">{{ formatDateTime(nodeTime(node)) }}</div>
        </div>
      </van-step>
    </van-steps>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTime } from '@/utils/format'
import { formatFlowNodeDisplayStatus } from '@/utils/dashboardTodo'
import { formatNodeAction, formatNodeRole } from '@/utils/flowTimelineFormat'
import { sortTimelineNodesAscending, stableTimelineNodeKey } from '@/utils/flowTimeline'

const props = defineProps({
  /** 流转日志节点（与 GET …/flow 的 nodes 或兼容 flowLogs 等一致） */
  nodes: { type: Array, default: () => [] },
  emptyDescription: { type: String, default: '暂无流转记录' },
})

const normalizedNodes = computed(() => (Array.isArray(props.nodes) ? props.nodes : []))

/** 时间正序：上早下晚；active 指向最后一项，表示时间线已读到最新一条 */
const sortedNodes = computed(() => sortTimelineNodesAscending(normalizedNodes.value))

const timelineActiveIndex = computed(() => {
  const n = sortedNodes.value.length
  if (n <= 0) return 0
  return Math.max(0, n - 1)
})

function nodeTitle(n) {
  if (!n || typeof n !== 'object') return '—'
  return (
    String(
      n.nodeName ??
        n.title ??
        n.fromDisplayName ??
        n.operatorName ??
        '节点',
    ).trim() || '—'
  )
}

function nodeRole(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.nodeRole
  return r != null ? String(r).trim() : ''
}

function nodeAction(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.action ?? n.actionType
  return r != null ? String(r).trim() : ''
}

function nodeDisplayStatus(n) {
  if (!n || typeof n !== 'object') return ''
  const s = n.displayStatus ?? n.status ?? n.nodeStatus
  return s != null && String(s).trim() !== '' ? String(s).trim() : ''
}

function nodeRemark(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.remark ?? n.comment
  return r != null && String(r).trim() !== '' ? String(r).trim() : ''
}

function nodeTime(n) {
  if (!n || typeof n !== 'object') return null
  return n.operateTime ?? n.createTime ?? n.auditTime ?? null
}

function operatorLine(n) {
  if (!n || typeof n !== 'object') return ''
  const name = n.operatorName
  if (name != null && String(name).trim() !== '') {
    const uid = n.operatorUserId
    const uidPart = uid != null && String(uid).trim() !== '' ? `（ID ${String(uid).trim()}）` : ''
    return `操作人：${String(name).trim()}${uidPart}`
  }
  return ''
}

function versionLine(n) {
  if (!n || typeof n !== 'object') return ''
  const v = n.versionNo
  if (v == null || String(v).trim() === '') return ''
  return `提交次数：${String(v).trim()}`
}
</script>

<style scoped>
.flow-timeline {
  padding: 8px 0 4px;
}
.flow-node {
  padding-bottom: 8px;
  text-align: left;
}
.flow-node__title {
  font-weight: 600;
  font-size: 15px;
  color: #323233;
}
.flow-node__line {
  margin-top: 4px;
  font-size: 13px;
  color: #646566;
}
.flow-node__remark {
  margin-top: 6px;
  font-size: 13px;
  color: #323233;
  line-height: 1.45;
}
.flow-node__time {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}
</style>
