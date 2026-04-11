import { post } from './request'

/** POST /api/bindings — body: { childUserId, strategyId } */
export function bindStrategy(data) {
  return post('/bindings', data)
}
