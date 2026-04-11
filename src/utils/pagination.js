/**
 * 兼容分页：records/total、list/total、或直接数组
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
  const list =
    raw.records ??
    raw.list ??
    raw.content ??
    raw.rows ??
    raw.items ??
    raw.data?.records ??
    raw.data?.list ??
    raw.data?.content ??
    []
  const total =
    raw.total ??
    raw.totalElements ??
    raw.totalCount ??
    raw.count ??
    (Array.isArray(list) ? list.length : 0)
  /** Spring Page：number 为 0-based */
  const page =
    raw.page ??
    raw.pageNum ??
    raw.current ??
    (typeof raw.number === 'number' ? raw.number + 1 : 1)
  const pageSize =
    raw.pageSize ??
    raw.size ??
    raw.limit ??
    fallbackPageSize
  const pages = raw.pages ?? raw.totalPages
  let hasMore
  if (typeof pages === 'number' && pages > 0) {
    hasMore = page < pages
  } else {
    hasMore = list.length >= pageSize && page * pageSize < Number(total)
  }
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(total) || 0,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || fallbackPageSize,
    hasMore,
  }
}
