import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { fetchMe } from '@/api/user'
import { effectiveQualificationStatusForDisplay } from '@/utils/qualification'
import {
  formatDateTime,
  formatMoney,
  formatQualificationStatus,
  formatUserStatus,
  qualificationStatusTagType,
  userStatusTagType,
} from '@/utils/format'

export function pickProfile(u) {
  const p = u?.profile
  if (!p || typeof p !== 'object') return null
  return {
    nickname: p.nickname,
    realName: p.realName,
    idCardNo: p.idCardNo,
    serverName: p.serverName,
    tradingAccountId: p.tradingAccountId,
    exchangeUid: p.exchangeUid,
    principalAmount: p.principalAmount,
    walletName: p.walletName,
    walletAddress: p.walletAddress,
  }
}

export function referrerNick(u) {
  const n = u?.referrerNickname
  return n != null && String(n).trim() !== '' ? String(n) : '—'
}

export function txtCell(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

export function useProfileCore() {
  const auth = useAuthStore()
  const dashboard = useDashboardStore()
  const { userInfo } = storeToRefs(auth)

  async function reloadProfile() {
    if (!auth.isLogin) return
    try {
      const me = await fetchMe()
      auth.setUserInfo(me)
      dashboard.fetchPendingSummary().catch(() => {})
    } catch {
      /* 保留本地 */
    }
  }

  const profileDetailRows = computed(() => {
    const p = pickProfile(userInfo.value)
    if (!p) return []
    const rows = []
    const push = (title, raw) => {
      if (raw == null) return
      const s = String(raw).trim()
      if (s === '') return
      rows.push({ title, value: s })
    }
    push('服务器名称', p.serverName)
    push('交易账户ID', p.tradingAccountId)
    push('交易所UID', p.exchangeUid)
    push('券商名称', p.walletName)
    push('钱包地址（TRC20）', p.walletAddress)
    if (p.principalAmount != null && String(p.principalAmount).trim() !== '') {
      const n = Number(p.principalAmount)
      const amount = Number.isFinite(n) ? formatMoney(n) : String(p.principalAmount).trim()
      rows.push({
        title: '底仓本金',
        value: `${amount} USD`,
      })
    }
    return rows
  })

  const profileRaw = computed(() => {
    const p = userInfo.value?.profile
    if (!p || typeof p !== 'object') return null
    return p
  })

  const qualificationSectionVisible = computed(() => {
    const p = profileRaw.value
    if (!p) return false
    if (p.canResubmitQualification === true) return true
    const keys = [
      'qualificationStatus',
      'qualificationAuditTime',
      'qualificationSubmitCount',
      'qualificationLastSubmitTime',
    ]
    return keys.some((k) => p[k] != null && p[k] !== '')
  })

  const qualStatusRaw = computed(() => profileRaw.value?.qualificationStatus)

  const qualStatusForDisplay = computed(() => effectiveQualificationStatusForDisplay(userInfo.value))

  const qualificationAuditTime = computed(() => profileRaw.value?.qualificationAuditTime)

  const qualificationAuditRemark = computed(() => profileRaw.value?.qualificationAuditRemark)

  const qualificationSubmitCount = computed(() => profileRaw.value?.qualificationSubmitCount)

  const qualificationLastSubmitTime = computed(() => profileRaw.value?.qualificationLastSubmitTime)

  const showQualRejectedActions = computed(() => {
    if (Number(userInfo.value?.status) === 0) return false
    const v = qualStatusRaw.value
    if (v === 3 || v === 'REJECTED') return true
    const s = v != null ? String(v).trim().toUpperCase() : ''
    return s === 'REJECTED'
  })

  return {
    auth,
    userInfo,
    reloadProfile,
    profileDetailRows,
    profileRaw,
    qualificationSectionVisible,
    qualStatusRaw,
    qualStatusForDisplay,
    qualificationAuditTime,
    qualificationAuditRemark,
    qualificationSubmitCount,
    qualificationLastSubmitTime,
    showQualRejectedActions,
    formatDateTime,
    formatMoney,
    formatQualificationStatus,
    formatUserStatus,
    qualificationStatusTagType,
    userStatusTagType,
    txtCell,
    pickProfile,
    referrerNick,
  }
}
