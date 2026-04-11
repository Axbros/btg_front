import { ref } from 'vue'
import { parsePageResponse } from '@/utils/pagination'

const DEFAULT_PAGE_SIZE = 20

function responseHasExplicitTotal(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return false
  return 'total' in raw || 'totalElements' in raw || 'totalCount' in raw
}

/**
 * 直属/全部下级分页：请求 query page、pageSize；响应含 list/records/content + total（或 totalElements）
 */
export function usePagedTeamList(loadRaw) {
  const list = ref([])
  const total = ref(0)
  const loading = ref(false)
  const finished = ref(false)
  const refreshing = ref(false)
  const loadedOnce = ref(false)
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)

  async function fetchAndMerge() {
    const raw = await loadRaw({ page: page.value, pageSize: pageSize.value })
    const parsed = parsePageResponse(raw, pageSize.value)
    const rows = parsed.list
    const totalCount = Number(parsed.total) || 0

    total.value = totalCount

    if (page.value === 1) {
      list.value = rows
    } else {
      list.value = [...list.value, ...rows]
    }
    loadedOnce.value = true

    const loaded = list.value.length
    const explicit = responseHasExplicitTotal(raw)

    let hasMore
    if (explicit) {
      hasMore = totalCount > 0 ? loaded < totalCount : false
    } else {
      hasMore = parsed.hasMore
    }

    finished.value = !hasMore || rows.length === 0
    if (hasMore && rows.length > 0) {
      page.value += 1
    }
  }

  async function onLoad() {
    if (refreshing.value) return
    loading.value = true
    try {
      await fetchAndMerge()
    } catch {
      finished.value = true
    } finally {
      loading.value = false
    }
  }

  async function onRefresh() {
    page.value = 1
    finished.value = false
    list.value = []
    total.value = 0
    try {
      await fetchAndMerge()
    } catch {
      finished.value = true
    } finally {
      refreshing.value = false
    }
  }

  return {
    list,
    total,
    loading,
    finished,
    refreshing,
    loadedOnce,
    page,
    pageSize,
    onLoad,
    onRefresh,
  }
}
