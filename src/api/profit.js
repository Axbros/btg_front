import { get, post } from './request'

/** POST /api/profits/submit — body: ProfitSubmitRequest */
export function submitProfit(data) {
  return post('/profits/submit', data)
}

/** GET /api/profits/mine — query: page, size（MyBatis Page） */
export function fetchMyProfits(params) {
  return get('/profits/mine', params)
}

/**
 * GET /api/profits/referrer/records — 直属下级申报列表；page、pageSize；可选 status=PENDING|APPROVED|REJECTED
 * data：PageVo；records 项含 id、recordNo、userMobile、profitAmount、commissionRate、netAmount、status、submitTime 等
 */
export function fetchReferrerProfitRecords(params = {}) {
  return get('/profits/referrer/records', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    ...(params.status ? { status: params.status } : {}),
  })
}

/** GET /api/profits/referrer/records/{id} — ReferrerProfitRecordDetailVo（含 userNickname、strategyName；无 userId/referrerUserId/strategyId） */
export function fetchReferrerProfitRecord(id) {
  return get(`/profits/referrer/records/${id}`)
}

/** POST /api/profits/referrer/approve — body: { profitRecordId, remark? } */
export function approveReferrerProfit(data) {
  return post('/profits/referrer/approve', data)
}

/** POST /api/profits/referrer/reject — body: { profitRecordId, remark? } */
export function rejectReferrerProfit(data) {
  return post('/profits/referrer/reject', data)
}
