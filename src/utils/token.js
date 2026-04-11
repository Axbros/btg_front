/** 从登录响应中取出 token */
export function pickTokenFromLoginData(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  return (
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    data.data?.token ||
    ''
  )
}

export function pickUserFromLoginData(data) {
  if (!data || typeof data !== 'object') return null
  return data.user || data.userInfo || data.profile || data.me || null
}
