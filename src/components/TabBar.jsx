import { Text, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { SketchView as View } from './Sketch'
import { colors, fonts, status } from '../styles/tokens'

// Hand-drawn doodle icons, one per tab (24 x 24, pen strokes).
const ICONS = {
  health: (c) => <Path d="M2 13 L7 13 L9.5 7 L13 18 L15.5 11 L17 13 L22 13" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  security: (c) => (
    <Path d="M12 2.5 C 15 4.5 18 5 20.5 5 C 20.5 13 17.5 18.5 12 21.5 C 6.5 18.5 3.5 13 3.5 5 C 6 5 9 4.5 12 2.5 Z M8.5 12 L11 14.5 L15.5 9.5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  alerts: (c) => (
    <>
      <Path d="M12 3 C 8 3.2 6.2 6 6.3 10 C 6.4 14 5 16 3.5 17.5 L 20.5 17.3 C 19 16 17.6 14 17.7 10 C 17.8 6 16 3.1 12 3 Z" stroke={c} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <Path d="M9.5 20 C 10.5 21.6 13.5 21.6 14.5 20" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" />
    </>
  ),
  orders: (c) => (
    <Path d="M5 3.5 L19 3 L19.3 21 L5.2 20.6 Z M8 8 L16 7.8 M8 12 L16 12.1 M8 16 L13 16" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  control: (c) => (
    <>
      <Path d="M4 7 L20 7.3 M4 17 L20 16.8" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx="9" cy="7.1" r="2.6" stroke={c} strokeWidth={2} fill={colors.paper} />
      <Circle cx="15" cy="16.9" r="2.6" stroke={c} strokeWidth={2} fill={colors.paper} />
    </>
  ),
}

const LABEL = { health: 'Health', security: 'Security', alerts: 'Alerts', orders: 'Orders', control: 'Control' }

// The bottom bar for expo-router's <Tabs tabBar={...}>. `badges` maps a
// route name to a small count (open alerts).
export default function TabBar({ state, navigation, badges = {} }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Pen line along the top edge instead of a flat border. */}
      <Svg style={styles.line} width="100%" height={6} viewBox="0 0 100 6" preserveAspectRatio="none">
        <Path d="M0 3.2 C 20 2.2 35 4.2 55 3 C 72 2.2 86 3.8 100 2.8" stroke={colors.ink} strokeWidth={1.4} fill="none" vectorEffect="non-scaling-stroke" />
      </Svg>
      {state.routes.map((route, i) => {
        const focused = state.index === i
        const color = focused ? colors.ink : colors.placeholder
        const badge = badges[route.name]
        const onPress = () => {
          const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !ev.defaultPrevented) navigation.navigate(route.name)
        }
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={`${LABEL[route.name] || route.name}${badge ? `, ${badge} open` : ''}`}
            testID={`tab-${route.name}`}
          >
            <View style={styles.iconWrap}>
              <Svg width={24} height={24} viewBox="0 0 24 24">{(ICONS[route.name] || ICONS.health)(color)}</Svg>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: badge.level === 'critical' ? status.bad : status.warn }]}>
                  <Text style={styles.badgeText}>{badge.count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }, focused && styles.labelOn]}>{LABEL[route.name] || route.name}</Text>
            {focused ? (
              <Svg width={34} height={5} viewBox="0 0 34 5">
                <Path d="M2 3 C 10 1.5 22 4 32 2.2" stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
              </Svg>
            ) : <View style={{ height: 5 }} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.paper, paddingTop: 8 },
  line: { position: 'absolute', top: 0, left: 0, right: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  iconWrap: { width: 34, height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.body, fontSize: 13, marginTop: 1 },
  labelOn: { color: colors.ink },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.paper, fontSize: 11, fontWeight: '700' },
})
