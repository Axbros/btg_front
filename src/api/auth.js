import { post } from './request'

/** POST /api/auth/login — body: { mobile, password } → data: TokenResponse */
export function login(data) {
  return post('/auth/login', data)
}

/** POST /api/auth/register — body: RegisterRequest */
export function register(data) {
  return post('/auth/register', data)
}
