/**
 * 补仓「用户可见」简化态（与后端一致）。
 * 列表/标签/筛选用 userVisibleStatus；细粒度 status（1～8）仅用于详情、埋点等。
 */
export const REPLENISHMENT_USER_VISIBLE = {
  PENDING_REVIEW: 1,
  AWAITING_CONFIRM: 2,
  SUCCESS: 3,
  REJECTED: 4,
  CLOSED: 5,
}

/** @type {Record<number, string>} */
export const REPLENISHMENT_USER_VISIBLE_LABEL = {
  1: '待审核',
  2: '待确认',
  3: '已成功',
  4: '已拒绝',
  5: '已关闭',
}
