import { get, post, put } from './request'
import { normalizeProfitReport } from '@/utils/profitReportNormalize'

/**
 * GET /api/v1/profit-configs/self-under-parent — 分润配置平铺 + parentExchangeUid（团队长 exchange_uid）
 * @param {Record<string, unknown>} [config] — 可传 `{ skipGlobalToast: true }` 由调用方处理错误提示
 */
export function fetchSelfProfitConfigUnderParent(config = {}) {
  return get('/profit-configs/self-under-parent', undefined, config).then((data) => {
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
      return normalizeProfitReport(data)
    }
    return data
  })
}

/** GET /api/v1/profit-configs/my-children — 每项含 commissionMode 时经 {@link normalizeProfitReport} */
export function fetchMyChildProfitConfigs() {
  return get('/profit-configs/my-children').then((raw) => {
    if (!Array.isArray(raw)) return []
    return raw.map((row) => normalizeProfitReport(row))
  })
}

/**
 * POST /api/v1/profit-configs — 与后端创建 DTO 对齐时常见：childUserId、guaranteeRatio、nonGuaranteeRatio、commissionMode
 * @param {Record<string, unknown>} data
 */
export function createProfitConfig(data) {
  return post('/profit-configs', data)
}

/**
 * PUT /api/v1/profit-configs/{id} — 与后端 ProfitConfigUpdateRequest 一致：
 * guaranteeRatio、nonGuaranteeRatio、commissionMode（GUARANTEE | NON_GUARANTEE）
 * @param {Record<string, unknown>} data
 */
export function updateProfitConfig(id, data) {
  return put(`/profit-configs/${id}`, data)
}

/**
 * GET /api/v1/admin/profit-configs/pending-mode-audits
 * 根用户待审核的分润模式变更列表（支持数组或分页体）。
 * @param {{ page?: number, size?: number, pageSize?: number }} [params]
 */
export function fetchPendingModeAudits(params = {}, config = {}) {
  const page = params.page ?? 1
  const size = params.size ?? params.pageSize ?? 10
  return get('/admin/profit-configs/pending-mode-audits', { page, size }, config).then((raw) =>
    normalizePendingModeAuditList(raw),
  )
}

/**
 * GET /api/v1/admin/profit-configs/{id}/mode-change-detail
 * @param {number|string} id pendingConfigId
 */
export function fetchModeChangeDetail(id, config = {}) {
  return get(`/admin/profit-configs/${id}/mode-change-detail`, undefined, config).then((raw) =>
    normalizeModeChangeDetail(raw),
  )
}

/**
 * POST /api/v1/admin/profit-configs/{id}/approve-mode-change
 * @param {number|string} id pendingConfigId
 * @param {{ remark?: string }} [data]
 */
export function approveModeChange(id, data = {}, config = {}) {
  return post(`/admin/profit-configs/${id}/approve-mode-change`, data ?? {}, config)
}

/**
 * POST /api/v1/admin/profit-configs/{id}/reject-mode-change
 * @param {number|string} id pendingConfigId
 * @param {{ remark?: string }} [data]
 */
export function rejectModeChange(id, data = {}, config = {}) {
  return post(`/admin/profit-configs/${id}/reject-mode-change`, data ?? {}, config)
}

function normalizePendingModeAuditList(raw) {
  if (Array.isArray(raw)) return raw.map((row) => normalizePendingModeAuditRow(row))
  if (raw && typeof raw === 'object') {
    const records = Array.isArray(raw.records)
      ? raw.records
      : Array.isArray(raw.list)
        ? raw.list
        : []
    return {
      ...raw,
      records: records.map((row) => normalizePendingModeAuditRow(row)),
    }
  }
  return []
}

function normalizePendingModeAuditRow(row) {
  if (!row || typeof row !== 'object') return {}
  return {
    ...row,
    pendingConfigId: row.pendingConfigId ?? row.id ?? null,
    parentUserId: row.parentUserId ?? row.parent_user_id ?? null,
    childUserId: row.childUserId ?? row.child_user_id ?? null,
    commissionModeDesc: row.commissionModeDesc ?? row.commission_mode_desc ?? '',
    guaranteeRatio: row.guaranteeRatio ?? row.guarantee_ratio ?? null,
    nonGuaranteeRatio: row.nonGuaranteeRatio ?? row.non_guarantee_ratio ?? null,
    auditStatus: row.auditStatus ?? row.audit_status ?? row.status ?? '',
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  }
}

function normalizeModeChangeDetail(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const before = raw.beforeActiveConfig ?? raw.before_active_config ?? null
  const after = raw.afterPendingConfig ?? raw.after_pending_config ?? null
  return {
    ...raw,
    pendingConfigId: raw.pendingConfigId ?? raw.id ?? null,
    beforeActiveConfig: normalizeModeConfigLite(before),
    afterPendingConfig: normalizeModeConfigLite(after),
    auditStatus: raw.auditStatus ?? raw.audit_status ?? raw.status ?? '',
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  }
}

function normalizeModeConfigLite(cfg) {
  if (!cfg || typeof cfg !== 'object') return {}
  return {
    ...cfg,
    id: cfg.id ?? null,
    commissionMode: cfg.commissionMode ?? cfg.commission_mode ?? '',
    commissionModeDesc: cfg.commissionModeDesc ?? cfg.commission_mode_desc ?? '',
    guaranteeRatio: cfg.guaranteeRatio ?? cfg.guarantee_ratio ?? null,
    nonGuaranteeRatio: cfg.nonGuaranteeRatio ?? cfg.non_guarantee_ratio ?? null,
    createdAt: cfg.createdAt ?? cfg.created_at ?? null,
    updatedAt: cfg.updatedAt ?? cfg.updated_at ?? null,
    activeAt: cfg.activeAt ?? cfg.active_at ?? cfg.effectiveAt ?? cfg.effective_at ?? null,
    submitTime: cfg.submitTime ?? cfg.submit_time ?? cfg.createdAt ?? cfg.created_at ?? null,
  }
}
