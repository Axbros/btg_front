import axios from 'axios'
import { showToast } from 'vant'
import { getStoredToken } from '@/utils/auth'
import { triggerSessionExpired } from '@/utils/session'
import router from '@/router'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const TOAST_FALLBACK = '请求失败'

/** BOM / 零宽等：trim() 去不掉，会导致 Toast「有 message 但肉眼空白」 */
const INVISIBLE_CHARS_RE = /\uFEFF|\u200B|\u200C|\u200D|\u2060|\u2061|\u2062|\u2063|\u2064|\u180E/g

function stripInvisibleAndTrim(str) {
  if (typeof str !== 'string') return ''
  return str.replace(INVISIBLE_CHARS_RE, '').trim()
}

/** 业务码非 200（支持数字或字符串）；0 视为成功，避免误解析嵌套 data */
function businessCodeIsError(code) {
  if (code === undefined || code === null || code === '') return false
  const n = Number(code)
  if (Number.isNaN(n)) return false
  if (n === 0) return false
  return n !== 200
}

/**
 * 外层 code=200、真实错误在 data.code 时的包装（否则会 Toast 到外层的「success」等短文案）。
 */
function unwrapNestedBusinessEnvelope(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const inner = obj.data
  if (
    inner &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    'code' in inner &&
    businessCodeIsError(inner.code) &&
    Number(obj.code) === 200
  ) {
    return inner
  }
  return obj
}

/**
 * 从 HTTP / 业务错误 JSON 中尽量取出原始文案（可为 string、number、数组），再交给 normalizeToastMessage。
 * 避免使用 `a || b` 把合法数字 0 当「无文案」丢掉。
 */
function pickRawErrorMessage(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return null
  const keys = [
    'message',
    'msg',
    'Message',
    'detail',
    'description',
    'error_description',
    'errorMessage',
    'error_msg',
    'resultMessage',
    'errorMsg',
    'reason',
    'title',
    'error',
  ]
  for (const k of keys) {
    if (!(k in body)) continue
    const v = body[k]
    if (v == null) continue
    if (typeof v === 'string') {
      if (stripInvisibleAndTrim(v).length > 0) return v
      continue
    }
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (Array.isArray(v) && v.length > 0) return v
  }
  const errs = body.errors
  if (Array.isArray(errs) && errs.length > 0) return errs
  if (typeof body.data === 'string' && stripInvisibleAndTrim(body.data).length > 0) {
    return body.data
  }
  return null
}

/**
 * Vant Toast 的 message 只能是可展示的字符串/数字；后端若返回对象/数组会导致白块无文案。
 */
function normalizeToastMessage(raw) {
  if (raw == null) return TOAST_FALLBACK
  if (typeof raw === 'string') {
    const t = stripInvisibleAndTrim(raw)
    return t.length > 0 ? t : TOAST_FALLBACK
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw)
  }
  if (raw instanceof Error) {
    const t = stripInvisibleAndTrim(String(raw.message || ''))
    return t.length > 0 ? t : TOAST_FALLBACK
  }
  if (Array.isArray(raw)) {
    const parts = raw
      .map((x) => normalizeToastMessage(x))
      .filter((s) => s && s !== TOAST_FALLBACK)
    if (parts.length) return [...new Set(parts)].join('；')
    return TOAST_FALLBACK
  }
  if (typeof raw === 'object') {
    const nested =
      pickRawErrorMessage(raw) ??
      raw.message ??
      raw.msg ??
      raw.error
    if (nested != null && nested !== raw) {
      const s = normalizeToastMessage(nested)
      if (s !== TOAST_FALLBACK) return s
    }
    try {
      const s = JSON.stringify(raw)
      return s.length > 280 ? `${s.slice(0, 280)}…` : s
    } catch {
      return TOAST_FALLBACK
    }
  }
  return TOAST_FALLBACK
}

/** 业务层可读取 err.code / err.httpStatus；用于页面内状态分支（如 409 静默处理） */
function createApiRejectionError(rawMsg, { code, httpStatus } = {}) {
  const msg = normalizeToastMessage(rawMsg)
  const err = new Error(msg)
  if (code !== undefined && code !== null) {
    const n = Number(code)
    if (!Number.isNaN(n)) err.code = n
  }
  if (httpStatus != null) err.httpStatus = httpStatus
  return err
}

function toastApiMessage(raw) {
  const normalized = normalizeToastMessage(raw)
  const asString = typeof normalized === 'string' ? normalized : String(normalized)
  const visible = stripInvisibleAndTrim(asString)
  /** type 用 text；className 配合 App.vue 内样式，避免主题/继承把 Toast 变成白底白字 */
  showToast({
    type: 'text',
    message: visible.length > 0 ? visible : TOAST_FALLBACK,
    duration: 3200,
    wordBreak: 'break-word',
  })
}

const instance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  /** 4xx/5xx 也进响应拦截器，与 HTTP 200 + body.code 统一 Toast 业务错误 */
  validateStatus: () => true,
})

instance.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (err) => Promise.reject(err),
)

/**
 * 后端统一响应：{ code: 200, message: 'success', data: ... }
 * code !== 200 时 Toast message 并 reject；业务层拿到的始终是 data。
 * 非标准 JSON（如无 code 字段）仍兼容为成功，整包作为 data。
 */
function normalizeEnvelope(payload) {
  if (payload == null) return null
  if (typeof payload === 'object' && !Array.isArray(payload) && 'code' in payload) {
    return payload
  }
  return { code: 200, message: 'success', data: payload }
}

/** HTTP 异常或 Spring 等无 code 字段时的提示文案 */
function toastMessageFromErrorBody(status, body) {
  if (body != null && typeof body === 'object' && !Array.isArray(body)) {
    const b = unwrapNestedBusinessEnvelope(body)
    const picked = pickRawErrorMessage(b)
    if (picked != null) return picked
    if (businessCodeIsError(b.code)) return TOAST_FALLBACK
    return null
  }
  if (typeof body === 'string') {
    const t = stripInvisibleAndTrim(body)
    if (t.length > 0) return t
  }
  if (status >= 400) return `请求失败 (${status})`
  return null
}

function redirectToLogin() {
  triggerSessionExpired()
  if (router.currentRoute.value?.path !== '/login') {
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
  }
}

/**
 * 管理端部分旧接口在 {@code /api/admin/...}（去掉默认 base 的 /v1 后拼接），与业务 {@code /api/v1} 分离。
 */
function resolveAdminBaseUrl() {
  const def = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  if (typeof def === 'string' && /\/v1\/?$/.test(def)) {
    return def.replace(/\/v1\/?$/, '') || '/api'
  }
  return '/api'
}

/** GET {@code /api/admin/...} */
export function getAdmin(url, params, config = {}) {
  return instance
    .get(url, { ...config, params, baseURL: resolveAdminBaseUrl() })
    .then((res) => res.data)
}

/** POST {@code /api/admin/...} */
export function postAdmin(url, data, config = {}) {
  return instance.post(url, data, { ...config, baseURL: resolveAdminBaseUrl() }).then((res) => res.data)
}

/** POST 且无 body（与 {@link postWithoutBody} 相同语义，走 /api/admin base） */
export function postAdminWithoutBody(url, config = {}) {
  const { data: _omitData, headers: incomingHeaders, ...rest } = config
  return instance
    .request({
      method: 'POST',
      url,
      baseURL: resolveAdminBaseUrl(),
      ...rest,
      headers: {
        'Content-Type': false,
        ...(incomingHeaders && typeof incomingHeaders === 'object' ? incomingHeaders : {}),
      },
    })
    .then((res) => res.data)
}

instance.interceptors.response.use(
  (res) => {
    const status = res.status
    const body = res.data
    const skipGlobalToast = Boolean(res.config?.skipGlobalToast)

    if (status === 401 ) {
      redirectToLogin()
      const msg =
        toastMessageFromErrorBody(status, body) || '登录已失效，请重新登录'
      toastApiMessage(msg)
      return Promise.reject(new Error('unauthorized'))
    }

    if (status < 200 || status >= 400) {
      const msg = toastMessageFromErrorBody(status, body) || `请求失败 (${status})`
      if (!skipGlobalToast) toastApiMessage(msg)
      let bizCode
      if (body != null && typeof body === 'object' && !Array.isArray(body)) {
        const b = unwrapNestedBusinessEnvelope(body)
        if (b && typeof b === 'object' && b.code != null) {
          const n = Number(b.code)
          if (!Number.isNaN(n)) bizCode = n
        }
      }
      if (bizCode == null && status === 409) bizCode = 409
      return Promise.reject(createApiRejectionError(msg, { code: bizCode, httpStatus: status }))
    }

    const wrapped = normalizeEnvelope(body)
    let envelope = wrapped ?? { code: 200, message: 'success', data: body }
    envelope = unwrapNestedBusinessEnvelope(envelope)

    if (envelope.code === 401 ) {
      redirectToLogin()
      toastApiMessage(pickRawErrorMessage(envelope) ?? '登录已失效，请重新登录')
      return Promise.reject(new Error('unauthorized'))
    }

    if (businessCodeIsError(envelope.code)) {
      const msg = pickRawErrorMessage(envelope) ?? TOAST_FALLBACK
      if (!skipGlobalToast) toastApiMessage(msg)
      return Promise.reject(createApiRejectionError(msg, { code: envelope.code }))
    }

    return { ...res, data: envelope.data }
  },
  (err) => {
    const skipGlobalToast = Boolean(err.config?.skipGlobalToast)
    if (!err.response) {
      if (!skipGlobalToast) toastApiMessage(err?.message || '网络异常')
      return Promise.reject(err)
    }

    const status = err.response.status
    const body = err.response.data

    if (status === 401 || status === 403) {
      redirectToLogin()
      const msg = toastMessageFromErrorBody(status, body) || '登录已失效，请重新登录'
      toastApiMessage(msg)
      return Promise.reject(err)
    }

    const msg =
      toastMessageFromErrorBody(status, body) ||
      err?.message ||
      '网络异常'
    if (!skipGlobalToast) toastApiMessage(msg)
    return Promise.reject(err)
  },
)

/** 返回业务 data（拦截器已写入 res.data），勿把整个 AxiosResponse 当业务对象 */
export function get(url, params, config = {}) {
  return instance.get(url, { ...config, params }).then((res) => res.data)
}

export function post(url, data, config = {}) {
  return instance.post(url, data, config).then((res) => res.data)
}

/**
 * POST 且不携带请求体（不序列化 `{}`，避免触发仅允许无体的校验）。
 * 不传 `data`，并去掉默认 JSON Content-Type。
 */
export function postWithoutBody(url, config = {}) {
  const { data: _omitData, headers: incomingHeaders, ...rest } = config
  return instance
    .request({
      method: 'POST',
      url,
      ...rest,
      headers: {
        'Content-Type': false,
        ...(incomingHeaders && typeof incomingHeaders === 'object' ? incomingHeaders : {}),
      },
    })
    .then((res) => res.data)
}

export function put(url, data, config = {}) {
  return instance.put(url, data, config).then((res) => res.data)
}

export default instance
