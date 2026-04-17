import { get, post } from './request'

/**
 * 管理员：待资格审核用户分页。
 * GET {baseURL}/admin/users/pending-qualification
 */
export function getPendingQualificationUsers(params = {}) {
  const { page, size, pageSize, ...rest } = params
  return get('/admin/users/pending-qualification', {
    page: page ?? 1,
    size: size ?? pageSize ?? 10,
    ...rest,
  })
}

/**
 * 管理员：通过资格。
 * POST {baseURL}/admin/users/{userId}/approve-qualification
 */
export function approveQualification(userId, data = {}) {
  return post(`/admin/users/${userId}/approve-qualification`, data)
}

/**
 * 管理员：拒绝资格。
 * POST {baseURL}/admin/users/{userId}/reject-qualification
 */
export function rejectQualification(userId, data = {}) {
  return post(`/admin/users/${userId}/reject-qualification`, data)
}

/**
 * 用户：重新提交资格审核。
 * POST {baseURL}/user/qualification/resubmit
 */
export function resubmitQualification(data = {}) {
  return post('/user/qualification/resubmit', data)
}
