/** 将接口返回统一为数组（含 ApiResult.data 已为 List 的情况） */
export function asList(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') {
    const inner = raw.data
    if (Array.isArray(inner)) return inner
    return (
      raw.records ??
      raw.list ??
      raw.rows ??
      raw.items ??
      raw.data?.records ??
      raw.data?.list ??
      []
    )
  }
  return []
}
