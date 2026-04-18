/**
 * 将 GET /api/v1/user/team/descendants 的 data 解包为 { stats, tree }。
 * 树优先：data.records?.descendants；亦兼容 data.descendants、根数组、data.data 等。
 * 统计：根上 directCount / allDescendantCount，或 data.records 内同名字段。
 */
export function parseDescendantsResponse(raw) {
  if (Array.isArray(raw)) {
    return {
      stats: { directCount: null, allDescendantCount: null },
      tree: raw,
    }
  }
  const payload = normalizePayloadObject(raw)
  if (!payload) {
    return {
      stats: { directCount: null, allDescendantCount: null },
      tree: Array.isArray(raw) ? raw : [],
    }
  }

  const records = payload.records && typeof payload.records === 'object' && !Array.isArray(payload.records)
    ? payload.records
    : null

  let tree = pickTreeArray(
    records?.descendants,
    payload.descendants,
    Array.isArray(payload.children) ? payload.children : null,
  )
  if (!tree.length && Array.isArray(raw?.data) && !Array.isArray(raw)) {
    tree = raw.data
  }

  const directCount = pickCount(payload.directCount, records?.directCount, records?.direct)
  const allDescendantCount = pickCount(
    payload.allDescendantCount,
    records?.allDescendantCount,
    payload.totalDescendantCount,
    records?.totalDescendantCount,
  )

  return {
    stats: {
      directCount: directCount,
      allDescendantCount: allDescendantCount,
    },
    tree,
  }
}

function normalizePayloadObject(raw) {
  if (raw == null || Array.isArray(raw) || typeof raw !== 'object') return null
  if ('directCount' in raw || 'records' in raw || 'descendants' in raw) return raw
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    if ('records' in raw.data || 'directCount' in raw.data || 'descendants' in raw.data) {
      return raw.data
    }
    return raw.data
  }
  return null
}

function pickTreeArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c
  }
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}

function pickCount(...candidates) {
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue
    const n = Number(c)
    if (Number.isFinite(n)) return n
  }
  return null
}
