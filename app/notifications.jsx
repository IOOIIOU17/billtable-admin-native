import { useState } from 'react'
import { Text, StyleSheet, Linking, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SketchView as View } from '../src/components/Sketch'
import Button from '../src/components/Button'
import { registerForPush } from '../src/services/push'
import { takePendingTab } from '../src/state/session'
import { colors, fonts, fontSize, spacing } from '../src/styles/tokens'

// Explains the alerts BEFORE iOS shows its one-time "Allow notifications?"
// box, so the owner knows what saying yes is for.
export default function NotificationsSetup() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const next = () => {
    const tab = takePendingTab()
    router.replace(tab === 'alerts' ? '/(tabs)/alerts' : '/(tabs)/health')
  }

  const allow = async () => {
    setBusy(true)
    const r = await registerForPush({ ask: true })
    setBusy(false)
    setResult(r)
    if (r.ok) setTimeout(next, 900)
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.body, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <Text style={styles.title}>Turn on alerts?</Text>
      <Text style={styles.lead}>Your phone will buzz when something is wrong with TigTagTrue, even when this app is closed.</Text>
      <View style={styles.card}>
        <Text style={styles.item}>⚠  The server has errors, is overloaded, or is running out of memory</Text>
        <Text style={styles.item}>⚠  A backup failed or is late</Text>
        <Text style={styles.item}>⚠  Someone failed to sign in to Admin</Text>
        <Text style={styles.item}>✓  A quiet note when a problem is fixed</Text>
      </View>
      <Text style={styles.small}>
        Serious problems ring. The same problem is not sent again for 10 minutes. No marketing, ever.
      </Text>

      {result && !result.ok ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>{result.reason}</Text>
          {result.code === 'denied' ? <Button label="Open Settings" variant="outline" onPress={() => Linking.openSettings()} style={styles.btn} /> : null}
        </View>
      ) : null}
      {result?.ok ? <Text style={styles.ok}>✓ Alerts are on for this iPhone.</Text> : null}

      <Button label="Allow alerts" onPress={allow} loading={busy} disabled={!!result?.ok} style={styles.btn} />
      <Button label={result && !result.ok ? 'Continue without alerts' : 'Not now'} variant="outline" onPress={next} disabled={busy} style={styles.btn} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: spacing.md },
  title: { fontFamily: fonts.logo, fontSize: 40, color: colors.ink, lineHeight: 46 },
  lead: { fontFamily: fonts.body, fontSize: 18, color: colors.ink, marginVertical: spacing.sm, lineHeight: 24 },
  card: { borderWidth: 2, borderColor: colors.ink, borderRadius: 16, padding: spacing.sm, marginBottom: spacing.sm },
  item: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginVertical: 4, lineHeight: 21 },
  small: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, lineHeight: 17, marginBottom: spacing.sm },
  warn: { borderWidth: 2, borderColor: '#8A5A00', borderRadius: 16, padding: spacing.sm, marginBottom: spacing.xs, backgroundColor: '#FBF3E2' },
  warnText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, lineHeight: 21 },
  ok: { fontFamily: fonts.body, fontSize: fontSize.md, color: '#2E6B45', marginBottom: spacing.xs },
  btn: { marginTop: spacing.xs },
})
