import { get } from './request'

/**
 * 最新 MT5 账户快照（需登录，JWT 由 request 拦截器注入）。
 * GET /mt5/snapshots/latest
 */
export function fetchLatestMt5Snapshot() {
  return get('/mt5/snapshots/latest')
}
