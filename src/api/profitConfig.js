import { get, post, put } from './request'

/**
 * GET /api/v1/profit-configs/self-under-parent — 分润配置平铺 + parentExchangeUid（上级 exchange_uid）
 * @param {Record<string, unknown>} [config] — 可传 `{ skipGlobalToast: true }` 由调用方处理错误提示
 */
export function fetchSelfProfitConfigUnderParent(config = {}) {
  return get('/profit-configs/self-under-parent', undefined, config)
}

/** GET /api/v1/profit-configs/my-children */
export function fetchMyChildProfitConfigs() {
  return get('/profit-configs/my-children')
}

/** POST /api/v1/profit-configs */
export function createProfitConfig(data) {
  return post('/profit-configs', data)
}

/** PUT /api/v1/profit-configs/{id} */
export function updateProfitConfig(id, data) {
  return put(`/profit-configs/${id}`, data)
}
