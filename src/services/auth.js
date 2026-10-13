import api, { setToken, clearToken, getToken, getSavedPushToken, setSavedPushToken } from './api'

// Hermes has no atob, so the JWT payload is decoded by hand.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64UrlDecode(input) {
  const str = input.replace(/-/g, '+').replace(/_/g, '/')
  let out = ''
  let buffer = 0
  let bits = 0
  for (let i = 0; i < str.length; i += 1) {
    const idx = B64.indexOf(str[i])
    if (idx === -1) continue
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }
  return out
}

export function decodeJwt(token) {
  try {
    const parts = String(token).split('.')
    if (parts.length < 2) return null
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    return null
  }
}

export function isExpired(token) {
  const p = decodeJwt(token)
  if (!p?.exp) return false
  return p.exp * 1000 <= Date.now()
}

export function isAdminToken(token) {
  return decodeJwt(token)?.role === 'admin'
}

// POST /api/auth/admin-login takes the admin password AND the 6-digit code
// from the authenticator app in ONE request (same as the web Admin). There
// is no email: the admin is a single owner account.
export async function adminLogin(password, totpToken) {
  const res = await api.post('/api/auth/admin-login', { password, totpToken })
  const token = res.data?.accessToken
  if (!token) throw new Error('The server did not send a session.')
  await setToken(token)
  return token
}

// Logout: stop pushes to this phone first (needs the session), then end the
// session on the server, then forget it here. Each step is best effort so a
// dead network can never trap the owner in a logged-in app.
export async function logout() {
  const pushToken = await getSavedPushToken()
  const token = await getToken()
  if (token && pushToken) {
    try {
      await api.delete('/api/admin/push-tokens', { data: { token: pushToken }, timeout: 8000 })
    } catch {}
  }
  if (token) {
    try {
      await api.post('/api/auth/logout', null, { timeout: 8000 })
    } catch {}
  }
  await setSavedPushToken(null)
  await clearToken()
}
