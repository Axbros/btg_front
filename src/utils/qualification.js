/**
 * 资格审核状态（与后端 / profile 字段一致）：数值 1/2/3 或 PENDING / APPROVED / REJECTED
 */

export function pickQualificationStatus(user) {
  if (!user || typeof user !== 'object') return null
  const p = user.profile
  if (p && typeof p === 'object' && 'qualificationStatus' in p) {
    return p.qualificationStatus
  }
  return user.qualificationStatus ?? null
}

export function isQualificationApprovedValue(q) {
  if (q === 2 || q === '2') return true
  if (typeof q === 'string' && q.trim().toUpperCase() === 'APPROVED') return true
  return false
}

export function isQualificationPendingOrRejectedValue(q) {
  if (q === 1 || q === '1') return true
  if (q === 3 || q === '3') return true
  if (typeof q === 'string') {
    const s = q.trim().toUpperCase()
    return s === 'PENDING' || s === 'REJECTED'
  }
  return false
}

/** 资格字段为「已拒绝」：数值 3 或 REJECTED */
export function isQualificationRejectedValue(q) {
  if (q === 3 || q === '3') return true
  if (typeof q === 'string' && q.trim().toUpperCase() === 'REJECTED') return true
  return false
}

/**
 * 用于界面展示：根用户拒绝资格后，用户重新提交资料会进入账号 status=0（待审核），
 * 若后端仍下发旧的 qualificationStatus=已拒绝，此处统一按「待审核」展示。
 * 路由/权限仍可用 {@link pickQualificationStatus} 原始值。
 */
export function effectiveQualificationStatusForDisplay(user) {
  if (!user || typeof user !== 'object') return null
  const raw = pickQualificationStatus(user)
  const st = Number(user.status)
  if (Number.isFinite(st) && st === 0 && isQualificationRejectedValue(raw)) {
    return 1
  }
  return raw
}
