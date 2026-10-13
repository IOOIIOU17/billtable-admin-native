import { useState } from 'react'
import { Text, StyleSheet, Pressable } from 'react-native'
import { SketchView as View } from './Sketch'
import Light from './Light'
import { colors, fonts, fontSize, spacing } from '../styles/tokens'

// A hand-drawn card: title (with an optional light), content, and a short
// "What this means" line for a non-technical owner. The hint is folded to
// one line until tapped so the numbers stay on screen.
export default function Card({ title, light, right, hint, children, style, tone }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={[styles.card, tone ? { borderColor: tone } : null, style]}>
      {title || right ? (
        <View style={styles.head}>
          {light ? <View style={styles.light}><Light level={light} /></View> : null}
          {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : <View style={{ flex: 1 }} />}
          {right}
        </View>
      ) : null}
      {children}
      {hint ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityHint="Shows or hides the explanation">
          <Text style={styles.hint} numberOfLines={open ? undefined : 2}>
            <Text style={styles.hintLead}>What this means: </Text>
            {hint}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 16,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.paper,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  light: { marginRight: 8 },
  title: { flex: 1, fontFamily: fonts.logo, fontSize: 24, color: colors.ink, lineHeight: 28 },
  hint: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: spacing.xs, lineHeight: 17 },
  hintLead: { fontFamily: fonts.body, color: colors.ink },
})
