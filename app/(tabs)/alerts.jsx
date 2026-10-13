import { useCallback, useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import { SketchView as View } from '../../src/components/Sketch'
import Screen from '../../src/components/Screen'
import Light from '../../src/components/Light'
import { LivePill, LiveStale } from '../../src/components/LiveStatus'
import useNow from '../../src/hooks/useNow'
import { ops, useOps } from '../../src/state/ops'
import { RULE_LABEL, RULE_HINT, ago, dateTime, fmt } from '../../src/services/format'
import { colors, fonts, fontSize, spacing, status } from '../../src/styles/tokens'

// Open alerts first (red = critical, amber = warning), then the ones that
// closed by themselves. The server opens and closes them; nothing to tap.
export default function Alerts() {
  const s = useOps()
  const now = useNow(5000)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await ops.loadAlertHistory()
    } finally {
      setRefreshing(false)
    }
  }, [])

  return (
    <Screen title="Alerts" subtitle="Opened and closed by the server itself" right={<LivePill />} refreshing={refreshing} onRefresh={onRefresh}>
      <LiveStale />
      <Text style={styles.section}>Open now ({s.openAlerts.length})</Text>
      {s.openAlerts.length === 0 ? (
        <View style={styles.calm} testID="no-open-alerts">
          <Light level="ok" size={22} />
          <Text style={styles.calmText}>No open alerts. Everything is within the safe lines.</Text>
        </View>
      ) : (
        s.openAlerts.map((a) => <AlertCard key={a.id} a={a} now={now} open />)
      )}

      <Text style={[styles.section, { marginTop: spacing.sm }]}>Resolved</Text>
      {s.resolvedAlerts.length === 0 ? (
        <Text style={styles.none}>Nothing resolved yet.</Text>
      ) : (
        s.resolvedAlerts.map((a) => <AlertCard key={a.id} a={a} now={now} />)
      )}
      <Text style={styles.foot}>
        Alerts on this list also reach your phone as a push (once every 10 minutes per kind) and by email.
      </Text>
    </Screen>
  )
}

function AlertCard({ a, now, open }) {
  const critical = a.level === 'critical'
  const tone = open ? (critical ? status.bad : status.warn) : colors.light
  const bg = open ? (critical ? status.badBg : status.warnBg) : colors.paper
  return (
    <View style={[styles.card, { borderColor: tone, backgroundColor: bg }, !open && styles.cardResolved]} testID={open ? 'alert-open' : 'alert-resolved'}>
      <View style={styles.head}>
        <Light level={open ? (critical ? 'bad' : 'warn') : 'ok'} size={18} />
        <Text style={[styles.rule, open ? { color: tone } : null]}>{RULE_LABEL[a.rule] || a.rule}</Text>
        <Text style={styles.level}>{open ? (critical ? 'CRITICAL' : 'WARNING') : 'resolved'}</Text>
      </View>
      <Text style={styles.msg}>{a.message}</Text>
      {open && RULE_HINT[a.rule] ? <Text style={styles.hint}>What this means: {RULE_HINT[a.rule]}</Text> : null}
      <Text style={styles.meta}>
        {open ? `Open since ${dateTime(a.ts)} (${ago(a.ts, now)})` : `${dateTime(a.ts)} → resolved ${ago(a.resolvedAt, now)}`}
        {a.threshold != null ? ` · limit ${fmt(a.threshold, 1)}` : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.logo, fontSize: 24, color: colors.ink, marginBottom: spacing.xs },
  calm: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: status.ok, borderRadius: 16, padding: spacing.sm, backgroundColor: status.okBg },
  calmText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginLeft: 10, flex: 1 },
  none: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: colors.pencil },
  card: { borderWidth: 2, borderRadius: 16, padding: spacing.sm, marginBottom: spacing.sm },
  cardResolved: { borderWidth: 1.5, paddingVertical: 10 },
  head: { flexDirection: 'row', alignItems: 'center' },
  rule: { fontFamily: fonts.body, fontSize: 18, color: colors.ink, marginLeft: 8, flex: 1 },
  level: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginLeft: 6 },
  msg: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginTop: 4, lineHeight: 21 },
  hint: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: 4, lineHeight: 17 },
  meta: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginTop: 4 },
  foot: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: spacing.sm, textAlign: 'center' },
})
