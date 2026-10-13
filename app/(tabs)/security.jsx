import { memo, useCallback, useState } from 'react'
import { Text, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SketchView as View } from '../../src/components/Sketch'
import Card from '../../src/components/Card'
import Light from '../../src/components/Light'
import Button from '../../src/components/Button'
import { LivePill, LiveStale } from '../../src/components/LiveStatus'
import useNow from '../../src/hooks/useNow'
import { ops, useOps, toMs } from '../../src/state/ops'
import { eventText, maskIp, maskEmail, SEV_LEVEL, clock, ago } from '../../src/services/format'
import { colors, fonts, fontSize, spacing, status } from '../../src/styles/tokens'

const FIVE_MIN = 5 * 60 * 1000
const HOUR = 60 * 60 * 1000

// Count events newer than `ms`. The app holds the newest few hundred; if
// the oldest one held is still inside the window, there may be more.
function countSince(list, ms, now) {
  let n = 0
  for (const e of list) {
    const t = toMs(e.ts)
    if (t == null || now - t > ms) break
    const d = e.detail || {}
    n += d.aggregated && d.count ? Number(d.count) || 1 : 1
  }
  const oldest = toMs(list[list.length - 1]?.ts)
  const partial = list.length >= 200 && oldest != null && now - oldest < ms
  return { n, partial }
}

export default function Security() {
  const s = useOps()
  const now = useNow(5000)
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState('')

  const list = s.security
  const c5 = countSince(list, FIVE_MIN, now)
  const c60 = countSince(list, HOUR, now)
  const bad5 = list.filter((e) => e.severity !== 'info' && now - (toMs(e.ts) || 0) <= FIVE_MIN).length

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      await ops.refreshSecurity()
    } catch (e) {
      if (!e.unauthorized) setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const loadOlder = useCallback(async () => {
    if (loadingOlder) return
    setLoadingOlder(true)
    setError('')
    try {
      await ops.loadOlderSecurity()
    } catch (e) {
      if (!e.unauthorized) setError(e.message)
    } finally {
      setLoadingOlder(false)
    }
  }, [loadingOlder])

  const header = (
    <View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Security</Text>
          <Text style={styles.subtitle}>Every sign-in, block and lock, as it happens</Text>
        </View>
        <LivePill />
      </View>
      <LiveStale />
      <Card
        hint="One failed login is normal (people mistype). Many in a few minutes — especially from the same address — can be someone guessing passwords; the Alerts tab will flag it. Emails and IP addresses are partly hidden on purpose."
      >
        <View style={styles.counts}>
          <Count label="last 5 min" value={c5.n} plus={c5.partial} />
          <Count label="last hour" value={c60.n} plus={c60.partial} />
          <Count label="warnings, 5 min" value={bad5} tone={bad5 ? status.warn : null} />
        </View>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )

  const footer = (
    <View style={styles.footer}>
      {s.securityHasMore ? (
        <Button label="Load older" variant="outline" onPress={loadOlder} loading={loadingOlder} />
      ) : (
        <Text style={styles.end}>That is everything kept (90 days).</Text>
      )}
    </View>
  )

  return (
    <View style={styles.root}>
      <FlatList
        data={list}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => <EventRow e={item} now={now} />}
        ListHeaderComponent={header}
        ListFooterComponent={list.length ? footer : null}
        ListEmptyComponent={<Text style={styles.empty}>{s.everConnected ? 'Nothing yet.' : 'Loading…'}</Text>}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pencil} />}
        initialNumToRender={15}
        windowSize={7}
      />
      <View pointerEvents="none" style={[styles.band, { height: insets.top }]} />
    </View>
  )
}

function Count({ label, value, plus, tone }) {
  return (
    <View style={styles.count}>
      <Text style={[styles.countValue, tone ? { color: tone } : null]}>{value}{plus ? '+' : ''}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  )
}

const EventRow = memo(function EventRow({ e, now }) {
  const level = SEV_LEVEL[e.severity] || 'none'
  const ip = maskIp(e.ip)
  const email = maskEmail(e.email)
  const who = [email, ip ? `from ${ip}` : null].filter(Boolean).join(' ')
  return (
    <View style={[styles.row, level === 'bad' ? styles.rowBad : null]} testID="security-row">
      <View style={styles.rowHead}>
        <Light level={level} size={14} label={e.severity} />
        <Text style={[styles.rowText, level === 'bad' ? { color: status.bad } : null]} numberOfLines={2}>{eventText(e)}</Text>
      </View>
      <Text style={styles.rowMeta} numberOfLines={1}>
        {clock(e.ts)} · {ago(e.ts, now)}{who ? ` · ${who}` : ''}
      </Text>
      {e.route ? <Text style={styles.rowRoute} numberOfLines={1}>{e.route}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  band: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, minHeight: 44 },
  title: { fontFamily: fonts.logo, fontSize: fontSize.xxl, color: colors.ink, lineHeight: 42 },
  subtitle: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: -2 },
  counts: { flexDirection: 'row' },
  count: { flex: 1, alignItems: 'center' },
  countValue: { fontFamily: fonts.logo, fontSize: 34, color: colors.ink, lineHeight: 38 },
  countLabel: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: status.bad, marginBottom: spacing.xs },
  row: { paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.light },
  rowBad: { backgroundColor: status.badBg },
  rowHead: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginLeft: 8, flex: 1 },
  rowMeta: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginLeft: 22 },
  rowRoute: { fontFamily: fonts.hint, fontSize: 10, color: colors.placeholder, marginLeft: 22 },
  footer: { paddingTop: spacing.sm },
  end: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, textAlign: 'center' },
  empty: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.pencil, textAlign: 'center', marginTop: spacing.md },
})
