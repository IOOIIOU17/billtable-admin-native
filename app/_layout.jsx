import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { SketchView as View } from '../src/components/Sketch'
import * as Font from 'expo-font'
import { colors } from '../src/styles/tokens'
import { setUnauthorizedHandler } from '../src/services/api'
import { addTapListener } from '../src/services/push'
import { ops } from '../src/state/ops'
import { setPendingTab, isUnlocked } from '../src/state/session'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    Font.loadAsync({
      'Caveat-Bold': require('../assets/fonts/Caveat-Bold.ttf'),
      'Caveat-Regular': require('../assets/fonts/Caveat-Regular.ttf'),
      'PatrickHand-Regular': require('../assets/fonts/PatrickHand-Regular.ttf'),
      'Kalam-Regular': require('../assets/fonts/Kalam-Regular.ttf'),
    })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  // A dead session (401 anywhere, including the live feed) -> back to the
  // login screen, once per burst; the login screen says why.
  useEffect(() => {
    let last = 0
    setUnauthorizedHandler(() => {
      const now = Date.now()
      if (now - last < 3000) return
      last = now
      ops.stop()
      router.replace({ pathname: '/login', params: { reason: 'signed-out' } })
    })
    return () => setUnauthorizedHandler(null)
  }, [router])

  // Every push from the server is about an alert: open the Alerts tab. If
  // the app is still locked (Face ID) the tab is opened right after unlock.
  useEffect(() => {
    return addTapListener(() => {
      if (isUnlocked()) router.navigate('/(tabs)/alerts')
      else setPendingTab('alerts')
    })
  }, [router])

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* Browser (local testing / screenshots): a phone-width column. */}
      <View style={Platform.OS === 'web' ? styles.webFrame : styles.fill}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  webFrame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.paper },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
})
