import { memo, useCallback, useEffect, useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SketchView as View } from '../../src/components/Sketch'
import TouchableOpacity from '../../src/components/SketchTouchable'
import Screen from '../../src/components/Screen'
import Card from '../../src/components/Card'
import api, { apiMessage } from '../../src/services/api'
import { ORDER_STATUS_LABEL, money, dateTime, ago, fmt, statusTone } from '../../src/services/format'
import { rememberOrders } from '../../src/state/orders'
import { colors, fonts, fontSize, spacing, status } from '../../src/styles/tokens'

// The newest 50 orders, read-only. Changing an order is done in the web
// Admin or by the restaurant.
export default function Orders() {
  const router = useRouter()
  const [orders, setOrders] = useState(null)
  const [total, setTotal] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const [o, s] = await Promise.allSettled([
      api.get('/api/orders/all', { params: { limit: 50 } }),
      api.get('/api/admin/stats', { params: { period: 'today' } }),
    ])
    if (o.status === 'fulfilled') {
      const list = o.value.data?.data?.orders || []
      rememberOrders(list)
      setOrders(list)
      setTotal(o.value.data?.data?.total ?? null)
    } else if (o.reason?.response?.status !== 401) {
      setError(apiMessage(o.reason, 'Could not load orders.'))
      setOrders((cur) => cur || [])
    }
    if (s.status === 'fulfilled') setStats(s.value.data?.data || null)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const customers = stats?.usersByRole?.user ?? null

  return (
    <Screen title="Orders" subtitle={total != null ? `Newest 50 of ${fmt(total)} · read-only` : 'Newest 50 · read-only'} refreshing={refreshing} onRefresh={onRefresh}>
      {stats ? (
        <Card hint="Today is Los Angeles time. Changes to orders are made in the web Admin or by the restaurant.">
          <View style={styles.stats}>
            <Stat label="orders today" value={fmt(stats.todayOrders)} />
            <Stat label="sales today" value={money(stats.todayRevenue)} />
            <Stat label="restaurants" value={`${fmt(stats.activeRestaurants)}/${fmt(stats.restaurants)}`} sub="open / all" />
            <Stat label="customers" value={fmt(customers)} />
          </View>
          {stats.openIssues ? <Text style={styles.issues}>⚠ {stats.openIssues} open order problem{stats.openIssues > 1 ? 's' : ''} reported</Text> : null}
        </Card>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {orders === null ? <Text style={styles.empty}>Loading…</Text> : null}
      {orders && orders.length === 0 && !error ? <Text style={styles.empty}>No orders yet.</Text> : null}
      {(orders || []).map((o) => (
        <OrderRow key={o.id} o={o} onPress={() => router.push(`/order/${o.id}`)} />
      ))}
    </Screen>
  )
}

function Stat({ label, value, sub }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

const OrderRow = memo(function OrderRow({ o, onPress }) {
  const tone = statusTone(o.status)
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} accessibilityRole="button" testID="order-row">
      <View style={styles.rowTop}>
        <Text style={styles.num} numberOfLines={1}>{o.order_number || `#${o.id}`}</Text>
        <View style={[styles.pill, { borderColor: tone }]}>
          <Text style={[styles.pillText, { color: tone }]} numberOfLines={1}>{ORDER_STATUS_LABEL[o.status] || o.status}</Text>
        </View>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rest} numberOfLines={1}>{o.restaurant_name || 'Restaurant'}</Text>
        <Text style={styles.total}>{money(o.total_amount)}</Text>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {o.customer_name || 'Customer'} · {dateTime(o.created_at)} ({ago(o.created_at)})
      </Text>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { width: '50%', paddingVertical: 4 },
  statValue: { fontFamily: fonts.logo, fontSize: 30, color: colors.ink, lineHeight: 34 },
  statLabel: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil },
  statSub: { fontFamily: fonts.hint, fontSize: 10, color: colors.placeholder },
  issues: { fontFamily: fonts.body, fontSize: 14, color: status.warn, marginTop: 4 },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: status.bad, marginBottom: spacing.xs },
  empty: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.pencil, textAlign: 'center', marginTop: spacing.md },
  row: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  num: { fontFamily: fonts.body, fontSize: 17, color: colors.ink, flex: 1, marginRight: 8 },
  pill: { borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, maxWidth: 170 },
  pillText: { fontFamily: fonts.hint, fontSize: 12 },
  rowMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  rest: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1, marginRight: 8 },
  total: { fontFamily: fonts.body, fontSize: 17, color: colors.ink },
  meta: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginTop: 2 },
})
