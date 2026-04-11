const TOKEN_KEY = 'commission_token'
const USER_KEY = 'commission_user'

/**
 * 规范化 GET /api/user/me 的 data。
 * 后端若返回 {} 或缺少可识别用户字段，按「无用户信息」处理（避免 {} 被当成 truthy）。
 */
export function normalizeUserMePayload(u) {
  if (u == null || typeof u !== 'object' || Array.isArray(u)) return null
  if (Object.keys(u).length === 0) return null
  const hasId = u.id != null && u.id !== ''
  const hasMobile = u.mobile != null && String(u.mobile).trim() !== ''
  if (!hasId && !hasMobile) return null
  return u
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const s = localStorage.getItem(USER_KEY)
    if (!s) return null
    const raw = JSON.parse(s)
    return normalizeUserMePayload(raw)
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export { TOKEN_KEY, USER_KEY }
