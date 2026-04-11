/**
 * 兼容多种后端管理员字段
 */
export function isUserAdmin(user) {
  if (!user || typeof user !== 'object') return false
  if (user.isAdmin === true) return true
  if (user.role === 'ADMIN' || user.role === 'admin') return true
  const roles = user.roles
  if (Array.isArray(roles)) {
    return roles.some((r) => String(r).toUpperCase() === 'ADMIN')
  }
  return false
}
