import { Text, StyleSheet } from 'react-native'
import TouchableOpacity from './SketchTouchable'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, fontSize, spacing } from '../styles/tokens'

// Exported so Screen can start its content exactly where this control ends
// instead of both guessing from separate numbers.
export const BACK_OFFSET = spacing.xs
export const BACK_HEIGHT = 37

export default function BackButton() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  if (!router.canGoBack()) return null

  return (
    <TouchableOpacity
      style={[styles.button, { top: insets.top + BACK_OFFSET }]}
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.text}>← Back</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.sm,
    zIndex: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  text: {
    fontFamily: fonts.hint,
    fontSize: fontSize.sm,
    color: colors.pencil,
  },
})
