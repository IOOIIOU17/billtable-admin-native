// WEB ONLY: expo-secure-store has no browser version; localStorage stands in.
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED'
export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK'
export async function getItemAsync(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}
export async function setItemAsync(key, value) {
  try { window.localStorage.setItem(key, value) } catch { /* private mode */ }
}
export async function deleteItemAsync(key) {
  try { window.localStorage.removeItem(key) } catch { /* private mode */ }
}
