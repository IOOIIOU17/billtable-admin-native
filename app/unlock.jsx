import { useCallback, useEffect, useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SketchView as View } from '../src/components/Sketch'
import Button from '../src/components/Button'
import { unlockWithBiometrics, biometricName } from '../src/services/biometric'
import { logout } from '../src/services/auth'
import { setUnlocked, takePendingTab } from '../src/state/session'
import { colors, fonts, fontSize, spacing } from '../src/styles/tokens'

// Shown when the app opens with a saved admin session. Face ID (or the
// phone passcode) opens it; "Sign in with password" logs out and starts over.
export default function Unlock() {
  const router = useRouter()
  const [name, setName] = useState('Face ID')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const go = useCallback(async () => {
    setBusy(true)
    setError('')
    const r = await unlockWithBiometrics()
    setBusy(false)
    if (r.success) {
      setUnlocked(true)
      const tab = takePendingTab()
      router.replace(tab === 'alerts' ? '/(tabs)/alerts' : '/(tabs)/health')
    } else if (r.error && r.error !== 'user_cancel' && r.error !== 'app_cancel' && r.error !== 'system_cancel') {
      setError('Not recognised. Try again, or sign in with the password.')
    }
  }, [router])

  useEffect(() => {
    biometricName().then(setName)
    go()
  }, [go])

  const usePassword = async () => {
    setBusy(true)
    await logout()
    setBusy(false)
    router.replace('/login')
  }

  return (
    <View style={styles.root}>
      <Text style={styles.logo}>TigTagTrue</Text>
      <Text style={styles.sub}>Admin is locked</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={`Unlock with ${name}`} onPress={go} loading={busy} style={styles.btn} />
      <Button label="Sign in with password instead" variant="outline" onPress={usePassword} disabled={busy} style={styles.btn} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', paddingHorizontal: spacing.md },
  logo: { fontFamily: fonts.brand, fontSize: 56, color: colors.ink, textAlign: 'center', lineHeight: 62 },
  sub: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: colors.pencil, textAlign: 'center', marginBottom: spacing.lg },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: '#B3261E', textAlign: 'center', marginBottom: spacing.sm },
  btn: { marginTop: spacing.xs },
})
