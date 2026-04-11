import axios from 'axios'
import { showToast } from 'vant'
import { getStoredToken } from '@/utils/auth'
import { triggerSessionExpired } from '@/utils/session'
import router from '@/router'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const TOAST_FALLBACK = '请求失败'

/**
 * Vant Toast 的 message 只能是可展示的字符串/数字；后端若返回对象/数组会导致白块无文案。
 */
function normalizeToastMessage(raw) {
  if (raw == null) return TOAST_FALLBACK
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t.length > 0 ? t : TOAST_FALLBACK
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw)
  }
  if (raw instanceof Error) {
    const t = String(raw.message || '').trim()
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
    const nested = raw.message ?? raw.msg ?? raw.error
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

function toastApiMessage(raw) {
  showToast({
    message: normalizeToastMessage(raw),
    wordBreak: 'break-all',
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

/** 业务码非 200（支持数字或字符串） */
function businessCodeIsError(code) {
  if (code === undefined || code === null || code === '') return false
  const n = Number(code)
  if (Number.isNaN(n)) return false
  return n !== 200
}

/** HTTP 异常或 Spring 等无 code 字段时的提示文案 */
function toastMessageFromErrorBody(status, body) {
  if (body != null && typeof body === 'object' && !Array.isArray(body)) {
    if (businessCodeIsError(body.code)) {
      return body.message || body.msg || '请求失败'
    }
    if (body.message || body.msg) {
      return body.message || body.msg
    }
  }
  if (typeof body === 'string' && body.trim()) return body.trim()
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
 * 资方接口在 {@code /api/admin}，与业务 {@code /api/v1} 分离。
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

instance.interceptors.response.use(
  (res) => {
    const status = res.status
    const body = res.data

    if (status === 401 || status === 403) {
      redirectToLogin()
      const msg =
        toastMessageFromErrorBody(status, body) || '登录已失效，请重新登录'
      toastApiMessage(msg)
      return Promise.reject(new Error('unauthorized'))
    }

    if (status < 200 || status >= 400) {
      const msg = toastMessageFromErrorBody(status, body) || `请求失败 (${status})`
      toastApiMessage(msg)
      return Promise.reject(new Error(normalizeToastMessage(msg)))
    }

    const wrapped = normalizeEnvelope(body)
    const envelope = wrapped ?? { code: 200, message: 'success', data: body }

    if (
      envelope.code === 401 ||
      envelope.code === 403 ||
      envelope.code === '401' ||
      envelope.code === '403'
    ) {
      redirectToLogin()
      toastApiMessage(envelope.message || envelope.msg || '登录已失效，请重新登录')
      return Promise.reject(new Error('unauthorized'))
    }

    if (businessCodeIsError(envelope.code)) {
      const msg = envelope.message || envelope.msg || TOAST_FALLBACK
      toastApiMessage(msg)
      return Promise.reject(new Error(normalizeToastMessage(msg)))
    }

    return { ...res, data: envelope.data }
  },
  (err) => {
    if (!err.response) {
      toastApiMessage(err?.message || '网络异常')
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
    toastApiMessage(msg)
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

export function put(url, data, config = {}) {
  return instance.put(url, data, config).then((res) => res.data)
}

export default instance
