import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { BASE_URL } from './config'

// Own key: the customer and restaurant apps may be on the same phone and
// must never share a session with the owner's admin login.
const TOKEN_KEY = 'adminToken'
const PUSH_KEY = 'adminPushToken'

// The token is kept in memory too: the realtime stream and the 2 s polling
// would otherwise read the Keychain several times a second.
let cached
export async function getToken() {
  if (cached !== undefined) return cached
  try {
    cached = (await SecureStore.getItemAsync(TOKEN_KEY)) || null
  } catch {
    cached = null
  }
  return cached
}

export async function setToken(token) {
  cached = token
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken() {
  cached = null
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {}
}

export async function getSavedPushToken() {
  try {
    return (await SecureStore.getItemAsync(PUSH_KEY)) || null
  } catch {
    return null
  }
}
export async function setSavedPushToken(token) {
  try {
    if (token) await SecureStore.setItemAsync(PUSH_KEY, token)
    else await SecureStore.deleteItemAsync(PUSH_KEY)
  } catch {}
}

const api = axios.create({ baseURL: BASE_URL, timeout: 20000 })

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Called when the session dies (401): the root layout sends the owner back
// to the login screen. The realtime client reports its own 401s here too.
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = typeof fn === 'function' ? fn : null
}
export async function signalUnauthorized(code) {
  await clearToken()
  if (onUnauthorized) {
    try {
      onUnauthorized(code || null)
    } catch {}
  }
}

// A wrong password is also a 401, but that is the person typing, not a
// dead session: the login screen shows its own message.
const isLogin = (config) => String(config?.url || '').includes('/api/auth/admin-login')

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !isLogin(err.config)) {
      await signalUnauthorized(err.response?.data?.code)
    }
    return Promise.reject(err)
  }
)

// The API answers { status, message } on failures; show that instead of
// axios' "Request failed with status code 400".
export function apiMessage(err, fallback) {
  if (err?.code === 'ECONNABORTED') return 'The server took too long to answer.'
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check the internet connection.'
  return err?.response?.data?.message || err?.response?.data?.error || fallback
}

export default api
