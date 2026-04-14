import { get } from './request'

/** GET /dashboard/pending-summary（baseURL 含 /api/v1） */
export function getPendingSummary() {
  return get('/dashboard/pending-summary')
}

/**
 * 待办列表（统一聚合）。
 * GET /dashboard/todo-items
 * @param {{ page?: number, size?: number }} [params]
 */
export function getTodoItems(params = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 20
  return get('/dashboard/todo-items', { page, size })
}
