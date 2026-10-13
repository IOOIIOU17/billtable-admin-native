import { useEffect, useState } from 'react'
import { Text, StyleSheet, Switch, Linking, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { SketchView as View } from '../../src/components/Sketch'
import TouchableOpacity from '../../src/components/SketchTouchable'
import Screen from '../../src/components/Screen'
import Card from '../../src/components/Card'
import Field from '../../src/components/Field'
import Button from '../../src/components/Button'
import ConfirmSheet from '../../src/components/ConfirmSheet'
import Light from '../../src/components/Light'
import { LivePill } from '../../src/components/LiveStatus'
import { ops, useOpsValue } from '../../src/state/ops'
import { logout } from '../../src/services/auth'
import { registerForPush, permissionStatus } from '../../src/services/push'
import { getSavedPushToken } from '../../src/services/api'
import { setUnlocked } from '../../src/state/session'
import { BASE_URL, IS_PROD, WEB_ADMIN_URL } from '../../src/services/config'
import { colors, fonts, fontSize, spacing, status } from '../../src/styles/tokens'

export default function Control() {
  const router = useRouter()
  const enabled = useOpsValue((s) => (s.limiter ? (s.limiter.enabled ? 'on' : 'off') : ''))
  const threshold = useOpsValue((s) => s.limiter?.threshold ?? null)
  const inFlight = useOpsValue((s) => s.metrics?.inFlight ?? null)

  const [draft, setDraft] = useState('')
  const [sheet, setSheet] = useState(null) // { enabled, threshold }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [push, setPush] = useState({ state: 'checking' })
  const [loggingOut, setLoggingOut] = useState(false)

  // Fill the field from the server once, then leave the owner's typing alone.
  useEffect(() => {
    if (threshold != null && draft === '') setDraft(String(threshold))
  }, [threshold]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async () => {
      if (Platform.OS === 'web') return setPush({ state: 'web' })
      const perm = await permissionStatus()
      const saved = await getSavedPushToken()
      setPush({ state: perm === 'granted' && saved ? 'on' : perm === 'denied' ? 'denied' : 'off' })
    })()
  }, [])

  const isOn = enabled === 'on'
  const n = Number(draft)
  const valid = Number.isInteger(n) && n >= 1 && n <= 10000

  const ask = (nextEnabled) => {
    setError('')
    setDone('')
    if (!valid) {
      setError('The limit must be a whole number from 1 to 10000.')
      return
    }
    setSheet({ enabled: nextEnabled, threshold: n })
  }

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await ops.setLimiter(sheet.enabled, sheet.threshold)
      setDone(r.enabled ? `Brake is ON at ${r.threshold}.` : `Brake is OFF (limit kept at ${r.threshold}).`)
      setSheet(null)
    } catch (e) {
      if (!e.unauthorized) setError(e.message || 'Could not change the brake.')
    } finally {
      setBusy(false)
    }
  }

  const sheetLines = sheet
    ? sheet.enabled
      ? [
          `When the server is handling ${sheet.threshold} or more requests at the same moment, new ones get a polite "busy, try again" instead of making everything slow.`,
          'Real customers may see that message too while it is busy.',
          'You and this app are never blocked.',
          'Turn it OFF again when things calm down.',
        ]
      : ['Every request is served again, however busy the server gets.', `The limit (${sheet.threshold}) is kept for next time.`]
    : []

  const enablePush = async () => {
    setPush({ state: 'working' })
    const r = await registerForPush({ ask: true })
    setPush(r.ok ? { state: 'on' } : { state: r.code === 'denied' ? 'denied' : 'error', reason: r.reason })
  }

  const doLogout = async () => {
    setLoggingOut(true)
    ops.stop()
    await logout()
    setUnlocked(false)
    router.replace('/login')
  }

  const version = Constants.expoConfig?.version || '1.0.0'
  const build = Constants.expoConfig?.ios?.buildNumber || ''

  return (
    <Screen title="Control" subtitle="The emergency brake, links and your session" right={<LivePill />}>
      <Card
        title="Emergency brake"
        light={enabled ? (isOn ? 'warn' : 'ok') : 'none'}
        tone={isOn ? status.warn : undefined}
        hint="For emergencies only (an attack or a sudden flood of traffic). While it is ON and too many requests arrive at the same moment, the server turns new ones away with 'busy, try again' instead of falling over. Real customers may see that message too, so turn it off when things calm down."
      >
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.big} testID="limiter-state">{enabled ? (isOn ? 'ON' : 'OFF') : '…'}</Text>
            <Text style={styles.small}>
              {inFlight != null ? `${inFlight} request${inFlight === 1 ? '' : 's'} in progress right now` : 'Waiting for numbers…'}
              {threshold != null ? ` · limit ${threshold}` : ''}
            </Text>
          </View>
          <Switch
            value={isOn}
            onValueChange={(v) => ask(v)}
            disabled={!enabled || busy}
            trackColor={{ false: colors.light, true: status.warn }}
            thumbColor={colors.paper}
            ios_backgroundColor={colors.light}
            accessibilityLabel="Emergency brake"
            testID="limiter-switch"
          />
        </View>
        <Field
          label="Limit: requests at the same moment"
          value={draft}
          onChangeText={(t) => setDraft(t.replace(/\D/g, '').slice(0, 5))}
          keyboardType="number-pad"
          placeholder="e.g. 60"
          hint="Normal is under 10. Around 60 is a sensible brake for the current server."
          testID="limiter-threshold"
        />
        {isOn && valid && n !== threshold ? <Button label={`Change limit to ${n}`} variant="outline" onPress={() => ask(true)} /> : null}
        {error && !sheet ? <Text style={styles.error}>{error}</Text> : null}
        {done ? <Text style={styles.done}>✓ {done}</Text> : null}
      </Card>

      <Card title="Phone alerts" light={push.state === 'on' ? 'ok' : push.state === 'checking' || push.state === 'web' ? 'none' : 'warn'}
        hint="A push to this iPhone when an alert opens, a backup fails, or someone fails to sign in to Admin.">
        <Text style={styles.body}>
          {push.state === 'on' && 'On for this iPhone.'}
          {push.state === 'off' && 'Off. Turn them on to hear about problems when the app is closed.'}
          {push.state === 'denied' && 'Blocked in iPhone Settings. Open Settings > Notifications > TigTagTrue Admin.'}
          {push.state === 'working' && 'Setting up…'}
          {push.state === 'checking' && 'Checking…'}
          {push.state === 'web' && 'Push alerts work in the iPhone app only.'}
          {push.state === 'error' && (push.reason || 'Could not turn alerts on.')}
        </Text>
        {push.state === 'off' || push.state === 'error' ? <Button label="Turn on alerts" onPress={enablePush} style={styles.btn} /> : null}
        {push.state === 'denied' ? <Button label="Open Settings" variant="outline" onPress={() => Linking.openSettings()} style={styles.btn} /> : null}
      </Card>

      <Card title="Quick links">
        <LinkRow label="Open web Admin" sub="Orders, restaurants, customers, reports" onPress={() => Linking.openURL(WEB_ADMIN_URL)} />
      </Card>

      <View style={styles.about}>
        <Light level={IS_PROD ? 'ok' : 'warn'} size={12} />
        <Text style={styles.aboutText}>
          TigTagTrue Admin {version}{build ? ` (${build})` : ''} · {IS_PROD ? 'production server' : `TEST server ${BASE_URL}`}
        </Text>
      </View>
      <Button label="Log out" variant="outline" onPress={doLogout} loading={loggingOut} style={styles.btn} />
      <Text style={styles.small}>Logging out also stops alerts on this iPhone.</Text>

      <ConfirmSheet
        visible={!!sheet}
        title={sheet?.enabled ? `Turn the brake ON at ${sheet?.threshold}?` : 'Turn the brake OFF?'}
        lines={sheetLines}
        confirmLabel={sheet?.enabled ? 'Yes, turn it on' : 'Yes, turn it off'}
        onConfirm={confirm}
        onCancel={() => { setSheet(null); setError('') }}
        busy={busy}
        error={sheet ? error : ''}
      />
    </Screen>
  )
}

function LinkRow({ label, sub, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.link} accessibilityRole="link">
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.small}>{sub}</Text>
      </View>
      <Text style={styles.arrow}>↗</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  big: { fontFamily: fonts.logo, fontSize: 40, color: colors.ink, lineHeight: 44 },
  small: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, lineHeight: 17 },
  body: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, lineHeight: 21 },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: status.bad, marginTop: 4 },
  done: { fontFamily: fonts.body, fontSize: fontSize.md, color: status.ok, marginTop: 4 },
  btn: { marginTop: spacing.xs },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  linkLabel: { fontFamily: fonts.body, fontSize: 18, color: colors.ink },
  arrow: { fontFamily: fonts.body, fontSize: 22, color: colors.ink, marginLeft: 8 },
  about: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  aboutText: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginLeft: 6, flex: 1 },
})
