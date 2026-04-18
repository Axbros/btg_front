/**
 * 分页体：{ records, total, size, current, pages }（与列表 GET 的 data 一致）。
 */
export function parsePageResponse(raw, fallbackPageSize = 10) {
  if (raw == null) {
    return { list: [], total: 0, page: 1, pageSize: fallbackPageSize, hasMore: false }
  }
  if (Array.isArray(raw)) {
    return {
      list: raw,
      total: raw.length,
      page: 1,
      pageSize: raw.length || fallbackPageSize,
      hasMore: false,
    }
  }
  const { records, total, size, current, pages } = raw
  const pageSize = size ?? fallbackPageSize
  return {
    list: records,
    total,
    page: current,
    pageSize,
    hasMore: current < pages,
  }
}
