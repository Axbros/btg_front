import { setStoredToken, setStoredUser } from '@/utils/auth'

let logoutHandler = null

export function registerLogoutHandler(fn) {
  logoutHandler = fn
}

export function clearSessionStorage() {
  setStoredToken('')
  setStoredUser(null)
}

export function triggerSessionExpired() {
  clearSessionStorage()
  logoutHandler?.()
}
