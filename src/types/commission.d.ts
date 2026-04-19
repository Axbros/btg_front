/**
 * BTG Commission 前端与 REST 对齐的类型（手写；basePath 如 /api）。
 * 列表项若 Jackson 忽略 null，字段可能缺失，页面需空值展示。
 */

export interface PageSettlementMinePayableRow extends SettlementOrderRowDisplay {
  //  mine-payables 列表项
}

export interface SettlementOrderRowDisplay {
  id?: number | string
  status?: string | number
  rootReportId?: number | string
  root_report_id?: number | string
  payAmount?: number
  payableAmount?: number
  profitAmount?: number
  submitTime?: string
  createdTime?: string
  settlementNo?: string
  recordNo?: string
  profitRecordNo?: string
  fromUserNickname?: string | null
  fromUserMobile?: string | null
  from_user_nickname?: string | null
  from_user_mobile?: string | null
  subordinateNickname?: string | null
  userNickname?: string | null
  userMobile?: string | null
}

export interface ReplenishmentApplyVO {
  id?: number
  applyNo?: string
  apply_no?: string
  /** 细粒度流程状态（1～8），主要用于详情/埋点 */
  status?: number
  /** 用户可见简化态（1～5）；assigned 等场景可能为 null */
  userVisibleStatus?: number | null
  user_visible_status?: number | null
  userId?: number
  user_id?: number
  userNickname?: string | null
  user_nickname?: string | null
  userMobile?: string | null
  user_mobile?: string | null
  principalAmount?: number
  balanceAmount?: number
  replenishAmount?: number
  repaidAmount?: number
  pendingRepayAmount?: number
  remainingAmount?: number
  balanceScreenshotUrl?: string | null
  transferScreenshotUrl?: string | null
  transferRemark?: string | null
  submitTime?: string
  auditTime?: string
  walletName?: string | null
  walletAddress?: string | null
  acceptedAt?: string | null
  acceptedBy?: string | number | null
}

/** POST /admin/replenishments/{id}/capital-voucher；状态 7 须传 transferScreenshotUrl，状态 8 可省略以保留原凭证 */
export interface ReplenishmentCapitalVoucherBody {
  transferScreenshotUrl?: string
  transferRemark?: string
}

export interface RepayApplyVO {
  id?: number
  repayNo?: string
  status?: number
}

export interface DashboardPendingSummary {
  pendingSettlementPayableCount?: number
  pendingReplenishmentApplicantConfirmCount?: number
  totalPendingCount?: number
  [key: string]: unknown
}

export interface UserProfileVO {
  id?: number
  maxAssignableChildProfitRatio?: number
  max_assignable_child_profit_ratio?: number
  invitationCode?: string | null
  status?: number
  [key: string]: unknown
}

/** GET /mt5/snapshots/latest 的 data */
export interface Mt5LatestSnapshotVo {
  id?: number
  userId?: number
  accountId?: string
  serverName?: string
  balance?: number
  equity?: number
  lastBalance?: number
  lastEquity?: number
  profit?: number
  marginAmount?: number
  freeMargin?: number
  marginLevel?: number
  snapshotTime?: string
  [key: string]: unknown
}
