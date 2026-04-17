/**
 * 判断「当前登录用户」是否为「被查看用户」的直属上级（仅推荐关系，不含账号状态）。
 * 用于团队下级详情、分润比例等：仅直属上级可操作。
 */

import { isUserRoot } from '@/utils/permission'

export function pickLoggedInUserId(viewer) {
  if (!viewer || typeof viewer !== 'object') return null
  const v = viewer.id ?? viewer.userId
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * 下级 user VO 上的「直属上级用户 id」
 */
export function pickSubjectReferrerUserId(subjectUser) {
  if (!subjectUser || typeof subjectUser !== 'object') return null
  const v = subjectUser.referrerUserId ?? subjectUser.referrerId ?? subjectUser.parentUserId
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function isDirectSuperiorOfViewer(viewerUser, subjectUser) {
  const selfId = pickLoggedInUserId(viewerUser)
  const refId = pickSubjectReferrerUserId(subjectUser)
  if (selfId == null || refId == null) return false
  return selfId === refId
}

/**
 * 前端是否展示/允许进入「为下级调整分润比例」：
 * 根用户不提供该能力；非根用户须为该下级的直属上级，且下级已激活（status=1）。
 * 在「全部下级」树中打开非直属成员详情时为 false。
 */
export function canAdjustChildProfitRatioOnFrontend(viewerUser, subjectUser) {
  if (isUserRoot(viewerUser)) return false
  if (!isDirectSuperiorOfViewer(viewerUser, subjectUser)) return false
  if (Number(subjectUser?.status) !== 1) return false
  return true
}
