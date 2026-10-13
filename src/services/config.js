// Where the app talks to. Production by default; EXPO_PUBLIC_API_URL is only
// for local testing (e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:5096 npx expo start).
// Expo inlines EXPO_PUBLIC_* at build time, so a Release build made without
// it always points at production.
const PROD = 'https://billtable-backend.onrender.com'

function clean(url) {
  const s = String(url || '').trim().replace(/\/+$/, '')
  return /^https?:\/\//.test(s) ? s : ''
}

export const BASE_URL = clean(process.env.EXPO_PUBLIC_API_URL) || PROD
export const IS_PROD = BASE_URL === PROD
export const WEB_ADMIN_URL = 'https://billtable-admin.onrender.com'
