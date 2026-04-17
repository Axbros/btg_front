/**
 * 平台根用户（与后端 isRoot 一致）：与管理员角色无关。
 */
export function isUserRoot(user) {
  if (!user || typeof user !== 'object') return false
  const v = user.isRoot
  if (v === true || v === 1 || v === '1') return true
  if (v === false || v === 0 || v === '0') return false
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true
  return false
}

/**
 * 兼容多种后端管理员字段。
 * 根用户（isRoot 为 1/true 等）须与 isUserRoot 一致视为可进 requiresAdmin 路由，避免仅数字 1 时无法审核补仓。
 */
export function isUserAdmin(user) {
  if (!user || typeof user !== 'object') return false
  if (isUserRoot(user)) return true
  if (user.isAdmin === true) return true
  if (user.role === 'ADMIN' || user.role === 'admin') return true
  const roles = user.roles
  if (Array.isArray(roles)) {
    return roles.some((r) => String(r).toUpperCase() === 'ADMIN')
  }
  return false
}
