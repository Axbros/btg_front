<template>
  <div class="flow-stepper">
    <van-steps direction="vertical" :active="activeStepIndexComputed">
      <van-step v-for="(node, idx) in normalizedNodes" :key="idx">
        <div class="flow-node">
          <div class="flow-node__title">{{ nodeTitle(node) }}</div>
          <div v-if="nodeRole(node)" class="flow-node__line">角色：{{ formatNodeRole(nodeRole(node)) }}</div>
          <div v-if="nodeAction(node)" class="flow-node__line">动作：{{ formatNodeAction(nodeAction(node)) }}</div>
          <div v-if="nodeDisplayStatus(node)" class="flow-node__line">
            状态：{{ formatFlowNodeDisplayStatus(nodeDisplayStatus(node)) }}
          </div>
          <!-- <div v-if="operatorLine(node)" class="flow-node__line">{{ operatorLine(node) }}</div> -->
          <div v-if="versionLine(node)" class="flow-node__line">{{ versionLine(node) }}</div>
          <div v-if="nodeRemark(node)" class="flow-node__remark">{{ nodeRemark(node) }}</div>
          <div v-if="nodeTime(node)" class="flow-node__time">{{ formatDateTime(nodeTime(node)) }}</div>
        </div>
      </van-step>
    </van-steps>
    <van-empty v-if="!normalizedNodes.length" description="无节点记录" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTime } from '@/utils/format'
import { formatFlowNodeDisplayStatus } from '@/utils/dashboardTodo'

const props = defineProps({
  /** 流转节点列表（与 GET …/flow 的 nodes 一致） */
  nodes: { type: Array, default: () => [] },
  /** 指定当前步（0-based）；不传则高亮最后一步 */
  activeIndex: { type: Number, default: null },
})

const NODE_ROLE_LABELS = {
  APPLICANT: '申报人',
  UPLINE: '上级',
  ROOT: '根用户',
  ADMIN: '管理员',
}

const NODE_ACTION_LABELS = {
  SUBMIT: '提交',
  RESUBMIT: '重新提交',
  RETURN_TO_APPLICANT: '退回修改',
  APPROVE: '通过',
  REJECT: '拒绝',
}

const normalizedNodes = computed(() => (Array.isArray(props.nodes) ? props.nodes : []))

const activeStepIndexComputed = computed(() => {
  const arr = normalizedNodes.value
  if (!arr.length) return 0
  const custom = props.activeIndex
  if (custom != null && Number.isFinite(Number(custom))) {
    const n = Number(custom)
    return Math.min(Math.max(0, n), arr.length - 1)
  }
  return Math.max(0, arr.length - 1)
})

function formatNodeRole(raw) {
  const k = String(raw || '').toUpperCase()
  return NODE_ROLE_LABELS[k] || String(raw)
}

function formatNodeAction(raw) {
  const k = String(raw || '').toUpperCase()
  return NODE_ACTION_LABELS[k] || String(raw)
}

function nodeTitle(n) {
  if (!n || typeof n !== 'object') return '—'
  return String(n.operatorName ?? '节点').trim() || '—'
}

function nodeRole(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.nodeRole ?? n.node_role
  return r != null ? String(r).trim() : ''
}

function nodeAction(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.action ?? n.actionType ?? n.action_type
  return r != null ? String(r).trim() : ''
}

function nodeDisplayStatus(n) {
  if (!n || typeof n !== 'object') return ''
  const s = n.displayStatus ?? n.display_status ?? n.status ?? n.nodeStatus ?? n.node_status
  return s != null && String(s).trim() !== '' ? String(s).trim() : ''
}

function nodeRemark(n) {
  if (!n || typeof n !== 'object') return ''
  const r = n.remark ?? n.comment
  return r != null && String(r).trim() !== '' ? String(r).trim() : ''
}

function nodeTime(n) {
  if (!n || typeof n !== 'object') return null
  return n.operateTime ?? n.operate_time ?? n.createTime ?? n.create_time ?? null
}

function operatorLine(n) {
  if (!n || typeof n !== 'object') return ''
  const name = n.operatorName ?? n.operator_name
  const uid = n.operatorUserId ?? n.operator_user_id
  if (name != null && String(name).trim() !== '') {
    return `操作人：${String(name).trim()}`
  }
  return ''
}

function versionLine(n) {
  if (!n || typeof n !== 'object') return ''
  const v = n.versionNo ?? n.version_no
  if (v == null || String(v).trim() === '') return ''
  return `提交次数：${String(v).trim()}`
}
</script>

<style scoped>
.flow-stepper {
  padding: 8px 0 4px;
}
.flow-node {
  padding-bottom: 8px;
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
