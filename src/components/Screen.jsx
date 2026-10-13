import { ScrollView, StyleSheet, RefreshControl, Text } from 'react-native'
import { SketchView as View } from './Sketch'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, fontSize, spacing } from '../styles/tokens'
import BackButton, { BACK_OFFSET, BACK_HEIGHT } from './BackButton'

// One screen of the admin app: a hand-lettered title (and optional line
// under it / thing on the right), then the content. Content and the back
// control are both placed from the live safe-area inset (see the
// restaurant app's Screen for why a fixed number does not work).
export default function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  back = false,
  refreshing,
  onRefresh,
  contentStyle,
  onEndReached,
  bottomPad = spacing.xl,
}) {
  const insets = useSafeAreaInsets()
  const top = back ? insets.top + BACK_OFFSET + BACK_HEIGHT + 4 : insets.top + spacing.xs

  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  ) : null

  if (!scroll) {
    return (
      <View style={styles.root}>
        {back ? <BackButton /> : null}
        <View style={[styles.body, { paddingTop: top, paddingBottom: bottomPad }, contentStyle]}>
          {header}
          {children}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.body, { paddingTop: top, paddingBottom: bottomPad }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        scrollEventThrottle={onEndReached ? 200 : undefined}
        onScroll={
          onEndReached
            ? ({ nativeEvent: e }) => {
                if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 300) onEndReached()
              }
            : undefined
        }
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.pencil} /> : undefined}
      >
        {header}
        {children}
      </ScrollView>
      {/* Paper band under the status bar so scrolled content slides under it. */}
      <View pointerEvents="none" style={[styles.band, { height: back ? insets.top + BACK_OFFSET + BACK_HEIGHT : insets.top }]} />
      {back ? <BackButton /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flexGrow: 1, paddingHorizontal: spacing.sm },
  band: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, minHeight: 44 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.logo, fontSize: fontSize.xxl, color: colors.ink, lineHeight: 42 },
  subtitle: { fontFamily: fonts.hint, fontSize: fontSize.xs, color: colors.pencil, marginTop: -2 },
  right: { marginLeft: spacing.xs, alignItems: 'flex-end' },
})
