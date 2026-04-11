/** 与后端 RegisterRequest 手机号规则一致 */
export const MOBILE_PATTERN = /^1\d{10}$/

export const mobileRules = [
  { required: true, message: '请填写手机号' },
  { pattern: MOBILE_PATTERN, message: '请输入 1 开头的 11 位手机号' },
]

/** 与后端密码长度 6～64 一致 */
export const registerPasswordRules = [
  { required: true, message: '请填写密码' },
  {
    validator: (val) => {
      const len = (val || '').length
      if (len < 6 || len > 64) return '密码长度需为 6～64 位'
      return true
    },
  },
]

export const loginPasswordRules = [{ required: true, message: '请填写密码' }]

/**
 * 注册确认密码（需与首次输入一致）
 * @param {() => string} getPassword 返回当前密码框的值
 */
export function createConfirmPasswordRules(getPassword) {
  return [
    { required: true, message: '请再次输入密码' },
    {
      validator: (val) => {
        if (val !== getPassword()) return '两次输入的密码不一致'
        return true
      },
    },
  ]
}

export const invitationCodeRules = [
  { required: true, message: '请填写邀请码' },
  {
    validator: (val) => {
      if (!String(val || '').trim()) return '邀请码不能只含空格'
      return true
    },
  },
]
