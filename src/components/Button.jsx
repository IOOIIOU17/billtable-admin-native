import { Text, ActivityIndicator, StyleSheet } from 'react-native'
import TouchableOpacity from './SketchTouchable'
import { colors, fonts, fontSize, radius, spacing } from '../styles/tokens'

export default function Button({
  label,
  onPress,
  variant = 'solid',
  disabled = false,
  loading = false,
  style,
}) {
  const solid = variant === 'solid'
  const off = disabled || loading

  return (
    <TouchableOpacity
      onPress={off ? undefined : onPress}
      activeOpacity={0.7}
      disabled={off}
      style={[
        styles.base,
        solid ? styles.solid : styles.outline,
        off ? styles.off : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? colors.paper : colors.ink} />
      ) : (
        <Text style={[styles.text, solid ? styles.textSolid : styles.textOutline]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  solid: { backgroundColor: colors.ink },
  outline: { backgroundColor: colors.paper },
  off: { opacity: 0.4 },
  text: { fontFamily: fonts.body, fontSize: fontSize.md },
  textSolid: { color: colors.paper },
  textOutline: { color: colors.ink },
})
