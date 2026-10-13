import { Text, StyleSheet } from 'react-native'
import { SketchView as View } from './Sketch'
import Button from './Button'
import { colors, fonts, fontSize, spacing, status } from '../styles/tokens'

// Shown whenever the newest numbers are older than 3 s, so a frozen screen
// is never mistaken for a calm server.
export default function StaleBanner({ age, conn, lastError, onRetry }) {
  const secs = age == null ? null : Math.round(age / 1000)
  const title = conn === 'paused' ? 'PAUSED' : 'STALE'
  const text = age == null
    ? 'No numbers from the server yet.'
    : `These numbers are ${secs} s old. They may not show what is happening now.`
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {lastError?.message ? <Text style={styles.err}>Last problem: {lastError.message}</Text> : null}
      {onRetry ? <Button label="Reconnect now" variant="outline" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderColor: status.bad, borderRadius: 16, backgroundColor: status.badBg, padding: spacing.sm, marginBottom: spacing.sm },
  title: { fontFamily: fonts.logo, fontSize: 26, color: status.bad, lineHeight: 30 },
  text: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink },
  err: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: 4 },
  btn: { marginTop: spacing.xs, minHeight: 44, paddingVertical: 8 },
})
