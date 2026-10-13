// WEB ONLY: no Face ID in a browser; the app simply skips the lock screen.
export const AuthenticationType = { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 }
export async function hasHardwareAsync() { return false }
export async function isEnrolledAsync() { return false }
export async function supportedAuthenticationTypesAsync() { return [] }
export async function authenticateAsync() { return { success: false, error: 'not_available' } }
