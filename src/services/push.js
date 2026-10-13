import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import api, { setSavedPushToken } from './api'

// Alerts that arrive while the app is open still show as a banner: the
// owner may be on the Orders tab when the server starts failing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function projectId() {
  return Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || null
}

export async function permissionStatus() {
  try {
    const p = await Notifications.getPermissionsAsync()
    return p.status // 'granted' | 'denied' | 'undetermined'
  } catch {
    return 'denied'
  }
}

function deviceName() {
  const name = Device.deviceName || Device.modelName || 'iPhone'
  return String(name).slice(0, 100)
}

// Returns { ok, token?, reason?, code? }. Every failure carries a plain
// sentence; the screen shows it instead of failing quietly, because a
// silent failure here means the owner never hears about an outage.
//   code: 'denied' | 'simulator' | 'no_project' | 'web' | 'server' | 'error'
export async function registerForPush({ ask = true } = {}) {
  if (Platform.OS === 'web') {
    return { ok: false, code: 'web', reason: 'Push alerts only work in the iPhone app.' }
  }
  try {
    let status = await permissionStatus()
    if (status !== 'granted' && ask) {
      const asked = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      })
      status = asked.status
    }
    if (status !== 'granted') {
      return { ok: false, code: 'denied', reason: 'Notifications are off for TigTagTrue Admin. Turn them on in Settings > Notifications > TigTagTrue Admin.' }
    }
    if (!Device.isDevice) {
      return { ok: false, code: 'simulator', reason: 'A simulator cannot receive push alerts. Use a real iPhone.' }
    }
    const pid = projectId()
    if (!pid) {
      // getExpoPushTokenAsync needs the EAS project id to know which app the
      // token belongs to. It is created once with `npx eas init`.
      return {
        ok: false,
        code: 'no_project',
        reason: 'This build has no Expo project ID yet, so push alerts cannot be set up. Run "npx eas init" in the app folder on the Mac, then build again.',
      }
    }
    const res = await Notifications.getExpoPushTokenAsync({ projectId: pid })
    const token = res?.data
    if (!token) return { ok: false, code: 'error', reason: 'Could not get a push token from Apple / Expo.' }
    try {
      await api.post('/api/admin/push-tokens', { token, deviceName: deviceName() })
    } catch (e) {
      return { ok: false, code: 'server', reason: e?.response?.data?.message || 'The server did not save this phone. Try again.' }
    }
    await setSavedPushToken(token)
    return { ok: true, token }
  } catch (e) {
    return { ok: false, code: 'error', reason: e?.message || 'Push setup failed.' }
  }
}

// Every notification from the server carries data.screen = 'alerts'.
export function addTapListener(onTap) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    onTap(r?.notification?.request?.content?.data || {})
  })
  return () => sub.remove()
}

// The app was closed and opened by tapping a notification.
export async function launchedFromNotification() {
  try {
    const r = await Notifications.getLastNotificationResponseAsync()
    return r ? r.notification?.request?.content?.data || {} : null
  } catch {
    return null
  }
}
