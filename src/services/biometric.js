import * as LocalAuthentication from 'expo-local-authentication'

// Face ID (or Touch ID) on this phone and set up?
export async function biometricAvailable() {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
  } catch {
    return false
  }
}

export async function biometricName() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID'
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID'
  } catch {}
  return 'Face ID'
}

// { success } or { success: false, error }. The phone passcode is allowed as
// a fallback so a failed face scan never locks the owner out.
export async function unlockWithBiometrics() {
  try {
    return await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock TigTagTrue Admin',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    })
  } catch (e) {
    return { success: false, error: e?.message || 'failed' }
  }
}
