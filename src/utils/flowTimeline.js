/**
 * 从利润链路/业务流详情 VO 中取出时间线节点数组（多字段兼容）。
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {Record<string, unknown>[]}
 */
export function pickFlowTimelineNodes(payload) {
  if (!payload || typeof payload !== 'object') return []
  const raw =
    payload.nodes ??
    payload.Nodes ??
    payload.flowLogs ??
    payload.FlowLogs ??
    payload.timeline ??
    payload.Timeline ??
    payload.auditLogs ??
    payload.operationLogs
  return Array.isArray(raw) ? raw : []
}

function pickOperateTimeMs(node) {
  if (!node || typeof node !== 'object') return 0
  const t =
    node.operateTime ??
    node.createTime ??
    node.auditTime ??
    node.timestamp ??
    null
  if (t == null || t === '') return 0
  const d = t instanceof Date ? t : new Date(t)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : 0
}

/**
 * 时间正序：早在上、晚在下（适合竖向时间线）。
 * @param {Record<string, unknown>[]} nodes
 * @returns {Record<string, unknown>[]}
 */
export function sortTimelineNodesAscending(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return []
  return [...nodes].sort((a, b) => pickOperateTimeMs(a) - pickOperateTimeMs(b))
}

/**
 * @param {Record<string, unknown>} node
 * @param {number} index
 * @returns {string}
 */
export function stableTimelineNodeKey(node, index) {
  if (!node || typeof node !== 'object') return `tl-fallback-${index}`
  const id = node.id ?? node.logId ?? node.nodeId
  if (id != null && String(id).trim() !== '') return `tl-id-${String(id).trim()}`
  const uid = node.operatorUserId ?? node.operatorId ?? ''
  const act = node.action ?? node.actionType ?? ''
  const st = node.displayStatus ?? node.status ?? ''
  const t = String(
    node.operateTime ?? node.createTime ?? '',
  ).trim()
  return `tl-${String(uid)}-${String(act)}-${String(st)}-${t}-${index}`
}
