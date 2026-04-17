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
