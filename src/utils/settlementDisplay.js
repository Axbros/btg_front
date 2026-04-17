import { formatDateTime } from '@/utils/format'

export function trimStr(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

/**
 * 结算列表标题：优先付款人真实姓名#手机，否则单号/结算#id。
 * @param {Record<string, unknown>} item
 */
export function settlementListTitle(item) {
  if (!item || typeof item !== 'object') return '—'
  const nick = trimStr(item.fromUserNickname)
  const mobile = trimStr(item.fromUserMobile)
  if (nick && mobile) return `${nick}#${mobile}`
  if (nick) return nick
  if (mobile) return mobile
  const no =
    item.profitRecordNo ??
    item.recordNo ??
    item.settlementNo
  if (trimStr(no)) return String(no).trim()
  return item.id != null ? `结算 #${item.id}` : '—'
}

/**
 * 副行：无完整付款人信息时展示下级真实姓名等；时间。
 * @param {Record<string, unknown>} item
 */
export function settlementListMetaRest(item) {
  if (!item || typeof item !== 'object') return ''
  const parts = []
  const titleHasPayer =
    trimStr(item.fromUserNickname) &&
    trimStr(item.fromUserMobile)
  if (!titleHasPayer) {
    const nick = item.subordinateNickname ?? item.userNickname ?? item.userMobile
    if (nick) parts.push(String(nick))
  }
  const t = item.submitTime ?? item.createdTime
  if (t) parts.push(formatDateTime(t))
  return parts.join(' · ')
}
