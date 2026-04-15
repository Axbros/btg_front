/** 流转时间线：节点角色（与后端枚举对齐） */
export const NODE_ROLE_LABELS = {
  APPLICANT: '申报人',
  UPLINE: '上级',
  ROOT: '根用户',
  ADMIN: '管理员',
}

/** 流转时间线：节点动作 */
export const NODE_ACTION_LABELS = {
  SUBMIT: '提交',
  RESUBMIT: '重新提交',
  RETURN_TO_APPLICANT: '退回修改',
  APPROVE: '通过',
  REJECT: '拒绝',
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function formatNodeRole(raw) {
  if (raw == null || raw === '') return '—'
  const k = String(raw).toUpperCase()
  return NODE_ROLE_LABELS[k] || String(raw)
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function formatNodeAction(raw) {
  if (raw == null || raw === '') return '—'
  const k = String(raw).toUpperCase()
  return NODE_ACTION_LABELS[k] || String(raw)
}
