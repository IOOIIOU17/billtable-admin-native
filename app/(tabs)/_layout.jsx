import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import TabBar from '../../src/components/TabBar'
import { ops, useOpsValue } from '../../src/state/ops'
import { biometricAvailable } from '../../src/services/biometric'
import { setUnlocked } from '../../src/state/session'
import { colors } from '../../src/styles/tokens'

// Lock again with Face ID after this long in the background.
const RELOCK_AFTER_MS = 5 * 60 * 1000

export default function TabsLayout() {
  const router = useRouter()
  // "count:level" so the bar only re-renders when the badge changes.
  const badgeKey = useOpsValue((s) => (s.openAlerts.length ? `${s.openAlerts.length}:${s.openAlerts.some((a) => a.level === 'critical') ? 'critical' : 'warning'}` : ''))
  const wentAway = useRef(null)

  // The live feed runs while the tabs are on screen (it pauses itself in
  // the background and reconnects in the foreground).
  useEffect(() => {
    ops.start()
    return () => ops.stop()
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (next === 'background') wentAway.current = Date.now()
      else if (next === 'active' && wentAway.current) {
        const away = Date.now() - wentAway.current
        wentAway.current = null
        if (away > RELOCK_AFTER_MS && (await biometricAvailable())) {
          setUnlocked(false)
          router.replace('/unlock')
        }
      }
    })
    return () => sub.remove()
  }, [router])

  const [count, level] = badgeKey.split(':')
  const badges = badgeKey ? { alerts: { count: Number(count), level } } : {}

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} badges={badges} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
    >
      <Tabs.Screen name="health" />
      <Tabs.Screen name="security" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="control" />
    </Tabs>
  )
}
