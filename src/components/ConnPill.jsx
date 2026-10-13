import { Text, StyleSheet } from 'react-native'
import { SketchView as View } from './Sketch'
import { colors, fonts, status } from '../styles/tokens'
import { CONN_LABEL } from '../services/format'

const CONN_LEVEL = { live: 'ok', polling: 'warn', reconnecting: 'warn', connecting: 'none', offline: 'bad', paused: 'none' }

// "Live · 340 ms ago": how the app is getting its numbers and how fresh
// the newest one is.
export default function ConnPill({ conn, age }) {
  const level = CONN_LEVEL[conn] || 'none'
  const color = status[level]
  const fresh = age == null ? '' : age < 1000 ? `${Math.max(0, Math.round(age))} ms ago` : age < 60000 ? `${(age / 1000).toFixed(1)} s ago` : `${Math.round(age / 60000)} min ago`
  return (
    <View style={[styles.pill, { borderColor: color }]} accessibilityLabel={`Connection: ${CONN_LABEL[conn] || conn}. Updated ${fresh || 'never'}.`}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} sketch={false} />
        <Text style={[styles.conn, { color }]}>{CONN_LABEL[conn] || conn}</Text>
      </View>
      <Text style={styles.age}>{fresh ? `updated ${fresh}` : 'no data yet'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'flex-end', backgroundColor: colors.paper },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  conn: { fontFamily: 'PatrickHand-Regular', fontSize: 14 },
  age: { fontFamily: fonts.hint, fontSize: 11, color: colors.pencil, marginTop: -2 },
})
