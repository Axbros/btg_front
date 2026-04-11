import { get } from './request'

/** 启用中的分佣策略（用户侧） */
export function fetchStrategies() {
  return get('/strategies')
}
