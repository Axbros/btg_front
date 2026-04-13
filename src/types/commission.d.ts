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
  status?: number
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

/** 与后端 ReplenishmentApproveDTO 一致；POST /admin/replenishments/{id}/capital-voucher */
export interface ReplenishmentCapitalVoucherBody {
  transferScreenshotUrl: string
  transferRemark?: string
}

export interface RepayApplyVO {
  id?: number
  repayNo?: string
  status?: number
}

export interface DashboardPendingSummary {
  pendingSettlementPayableCount?: number
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
