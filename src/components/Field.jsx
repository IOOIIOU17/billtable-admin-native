import { forwardRef } from 'react'
import { Text, StyleSheet } from 'react-native'
import { SketchView as View, SketchTextInput as TextInput } from './Sketch'
import { colors, fonts, fontSize, radius, spacing } from '../styles/tokens'

// Label + hand-drawn input + hint. `inputStyle` adds to the input itself
// (e.g. the big spaced-out 2FA code); `ref` reaches the TextInput.
const Field = forwardRef(function Field({ label, hint, style, inputStyle, ...rest }, ref) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput ref={ref} placeholderTextColor={colors.placeholder} style={[styles.input, inputStyle]} {...rest} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
})

export default Field

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: colors.pencil, marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  hint: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: 4 },
})
