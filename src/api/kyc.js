import { post } from './request'

/**
 * POST /api/kyc/audit/approve
 * @param {{ targetUserId: number, remark?: string }} data
 */
export function approveKycAudit(data) {
  return post('/kyc/audit/approve', data)
}

/**
 * POST /api/kyc/audit/reject
 * @param {{ targetUserId: number, remark?: string }} data
 */
export function rejectKycAudit(data) {
  return post('/kyc/audit/reject', data)
}
