import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  normalizeUserMePayload,
} from '@/utils/auth'
import { isUserAdmin } from '@/utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getStoredToken())
  const userInfo = ref(getStoredUser())

  function setToken(t) {
    token.value = t || ''
    setStoredToken(token.value)
  }

  function setUserInfo(u) {
    const v = normalizeUserMePayload(u)
    userInfo.value = v
    setStoredUser(v)
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    setStoredToken('')
    setStoredUser(null)
  }

  const isLogin = computed(() => !!token.value)
  const isAdmin = computed(() => isUserAdmin(userInfo.value))

  /** /me 返回 status === -1：待完善资料，仅允许进入完善资料页 */
  const isProfileOnlyLocked = computed(() => Number(userInfo.value?.status) === -1)

  return {
    token,
    userInfo,
    setToken,
    setUserInfo,
    logout,
    isLogin,
    isAdmin,
    isProfileOnlyLocked,
  }
})
