import { Modal, Text, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SketchView as View } from './Sketch'
import Button from './Button'
import { colors, fonts, fontSize, spacing } from '../styles/tokens'

// A bottom sheet that says in plain English what is about to happen, with
// one clear "do it" button and a way out.
export default function ConfirmSheet({ visible, title, lines = [], confirmLabel, onConfirm, onCancel, busy, error }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.shade} onPress={busy ? undefined : onCancel} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs }]}>
        <Text style={styles.title}>{title}</Text>
        {lines.map((l, i) => (
          <Text key={i} style={styles.line}>• {l}</Text>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={confirmLabel} onPress={onConfirm} loading={busy} style={styles.btn} />
        <Button label="Cancel" variant="outline" onPress={onCancel} disabled={busy} style={styles.btn} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(26,26,26,0.35)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  title: { fontFamily: fonts.logo, fontSize: 28, color: colors.ink, marginBottom: spacing.xs },
  line: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.ink, marginBottom: 6, lineHeight: 21 },
  error: { fontFamily: fonts.hint, fontSize: fontSize.sm, color: '#B3261E', marginTop: 4 },
  btn: { marginTop: spacing.xs },
})
