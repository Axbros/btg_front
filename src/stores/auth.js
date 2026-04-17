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
import { useDashboardStore } from '@/stores/dashboard'
import {
  pickQualificationStatus,
  isQualificationApprovedValue,
  isQualificationPendingOrRejectedValue,
} from '@/utils/qualification'

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
    useDashboardStore().clearPendingSummary()
  }

  const isLogin = computed(() => !!token.value)
  const isAdmin = computed(() => isUserAdmin(userInfo.value))

  /** /me 返回 status === -1：待更新资料，仅允许进入更新资料页 */
  const isProfileOnlyLocked = computed(() => Number(userInfo.value?.status) === -1)

  /** /me 返回 status === 0：资料待审核 */
  const isProfilePendingReview = computed(() => Number(userInfo.value?.status) === 0)

  /** 待完善或待审核：与路由守卫一致（-1 仅资料页；0 为等待审核页 + 资料页） */
  const isRestrictedToProfileComplete = computed(
    () => isProfileOnlyLocked.value || isProfilePendingReview.value,
  )

  /** 仅审核通过（正常）后展示邀请注册/推荐码 */
  const canShowInviteCode = computed(() => Number(userInfo.value?.status) === 1)

  const qualificationStatusRaw = computed(() => pickQualificationStatus(userInfo.value))

  const isQualificationApproved = computed(() => isQualificationApprovedValue(qualificationStatusRaw.value))

  /** 资格待审或已拒绝：用于路由引导离开业务首页等 */
  const isQualificationPendingOrRejected = computed(() =>
    isQualificationPendingOrRejectedValue(qualificationStatusRaw.value),
  )

  return {
    token,
    userInfo,
    setToken,
    setUserInfo,
    logout,
    isLogin,
    isAdmin,
    isProfileOnlyLocked,
    isProfilePendingReview,
    isRestrictedToProfileComplete,
    canShowInviteCode,
    qualificationStatusRaw,
    isQualificationApproved,
    isQualificationPendingOrRejected,
  }
})
