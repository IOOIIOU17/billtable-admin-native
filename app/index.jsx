import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SketchView as View } from '../src/components/Sketch'
import { getToken, clearToken } from '../src/services/api'
import { isExpired, isAdminToken } from '../src/services/auth'
import { biometricAvailable } from '../src/services/biometric'
import { launchedFromNotification } from '../src/services/push'
import { isUnlocked, setUnlocked, setPendingTab, takePendingTab } from '../src/state/session'
import { colors } from '../src/styles/tokens'

// Decides where the app opens:
//   no / expired session            -> login
//   saved session + Face ID set up  -> unlock (unless already unlocked)
//   otherwise                       -> the tabs (Alerts if a push was tapped)
export default function Index() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const opened = await launchedFromNotification()
      if (opened) setPendingTab('alerts')
      const token = await getToken()
      if (cancelled) return
      if (!token || isExpired(token) || !isAdminToken(token)) {
        if (token) await clearToken()
        router.replace('/login')
        return
      }
      if (!isUnlocked() && (await biometricAvailable())) {
        router.replace('/unlock')
        return
      }
      setUnlocked(true)
      const tab = takePendingTab()
      router.replace(tab === 'alerts' ? '/(tabs)/alerts' : '/(tabs)/health')
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.ink} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
})
