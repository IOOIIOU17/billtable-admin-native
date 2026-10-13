import { Text, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { SketchView as View } from '../../src/components/Sketch'
import Screen from '../../src/components/Screen'
import Card from '../../src/components/Card'
import { orderById } from '../../src/state/orders'
import { ORDER_STATUS_LABEL, money, dateTime, maskEmail, statusTone } from '../../src/services/format'
import { colors, fonts, fontSize, spacing } from '../../src/styles/tokens'

// One order, read-only, from the list the Orders tab loaded.
export default function OrderDetail() {
  const { id } = useLocalSearchParams()
  const o = orderById(id)

  if (!o) {
    return (
      <Screen back title="Order">
        <Text style={styles.body}>This order is no longer in the list. Go back and pull down to refresh.</Text>
      </Screen>
    )
  }

  const tone = statusTone(o.status)
  const rows = [
    ['Status', ORDER_STATUS_LABEL[o.status] || o.status],
    ['Type', o.order_mode && o.order_mode !== 'delivery' ? 'Table at the restaurant' : 'Party catering'],
    ['Restaurant', o.restaurant_name],
    ['Restaurant phone', o.restaurant_phone],
    ['Customer', o.customer_name],
    ['Customer email', maskEmail(o.customer_email)],
    ['Theme', o.theme],
    ['Guests', o.guest_count ?? o.party_size],
    ['Payment', o.payment_status],
    ['Customer note', o.customer_comment],
    ['Party time', o.delivery_time ? dateTime(o.delivery_time) : null],
    ['Address', o.delivery_address],
    ['Allergies', o.allergies],
    ['Ordered', dateTime(o.created_at)],
    ['Last change', o.updated_at ? dateTime(o.updated_at) : null],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '')

  const money_rows = [
    ['Food', o.subtotal],
    ['Delivery', o.delivery_fee_amount],
    ['Service fee', o.platform_fee],
    [o.tax_label || 'Tax', o.tax_amount],
    ['Deposit', o.deposit_amount],
    ['Restaurant gets', o.restaurant_payout],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '')

  return (
    <Screen back title={o.order_number || `Order #${o.id}`} subtitle="Read-only">
      <View style={[styles.statusBox, { borderColor: tone }]}>
        <Text style={[styles.status, { color: tone }]}>{ORDER_STATUS_LABEL[o.status] || o.status}</Text>
        <Text style={styles.total}>{money(o.total_amount)}</Text>
      </View>
      <Card title="Details">
        {rows.map(([k, v]) => (
          <Row key={k} k={k} v={String(v)} />
        ))}
      </Card>
      {money_rows.length ? (
        <Card title="Money">
          {money_rows.map(([k, v]) => (
            <Row key={k} k={k} v={money(v)} />
          ))}
          <Row k="Total" v={money(o.total_amount)} strong />
        </Card>
      ) : null}
      <Text style={styles.foot}>To change this order, use the web Admin.</Text>
    </Screen>
  )
}

function Row({ k, v, strong }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{k}</Text>
      <Text style={[styles.v, strong && styles.strong]} selectable>{v}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink },
  statusBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderRadius: 16, padding: spacing.sm, marginBottom: spacing.sm },
  status: { fontFamily: fonts.logo, fontSize: 28, flex: 1 },
  total: { fontFamily: fonts.logo, fontSize: 30, color: colors.ink },
  row: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.light },
  k: { fontFamily: fonts.hint, fontSize: 13, color: colors.pencil, width: 120 },
  v: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1 },
  strong: { fontSize: 18 },
  foot: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, textAlign: 'center', marginTop: spacing.xs },
})
