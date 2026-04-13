/**
 * PUT /user/profile 中 Bitget 三字段语义（与后端一致）：
 * - 不传 key：不修改
 * - 非空字符串：写入新值
 * - 空字符串 ""：清空该项
 *
 * @param {Record<string, unknown>} body 已组好的 profile body（会被就地写入 bitget 相关 key）
 * @param {{ bitgetAccessKey?: string, bitgetSecretKey?: string, bitgetPassphrase?: string }} form
 * @param {{ bitgetAccessKey?: boolean, bitgetSecretKey?: boolean, bitgetPassphrase?: boolean }} clearFlags 为 true 时对该项写入 ""
 */
export function appendBitgetKeysToProfileBody(body, form, clearFlags = {}) {
  if (!body || typeof body !== 'object') return
  const keys = ['bitgetAccessKey', 'bitgetSecretKey', 'bitgetPassphrase']
  for (const k of keys) {
    if (clearFlags[k] === true) {
      body[k] = ''
      continue
    }
    const v = form[k] != null ? String(form[k]).trim() : ''
    if (v !== '') {
      body[k] = v
    }
  }
}
