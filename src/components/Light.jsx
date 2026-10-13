import { Text, StyleSheet } from 'react-native'
import { SketchView as View } from './Sketch'
import { colors, fonts, status } from '../styles/tokens'

// A traffic light that never relies on colour alone: it carries a glyph,
// and `word` adds the plain word next to it.
export const LIGHT_GLYPH = { ok: '✓', warn: '!', bad: '✕', none: '–' }
export const LIGHT_WORD = { ok: 'OK', warn: 'Watch', bad: 'Problem', none: 'No data' }

export default function Light({ level = 'none', size = 18, word = false, label }) {
  const color = status[level] || status.none
  return (
    <View style={styles.row} accessible accessibilityLabel={label || LIGHT_WORD[level]}>
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={[styles.glyph, { fontSize: size * 0.62, lineHeight: size }]}>{LIGHT_GLYPH[level]}</Text>
      </View>
      {word ? <Text style={[styles.word, { color }]}>{LIGHT_WORD[level]}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { alignItems: 'center', justifyContent: 'center' },
  glyph: { color: colors.paper, fontWeight: '700', textAlign: 'center' },
  word: { fontFamily: fonts.body, fontSize: 14, marginLeft: 6 },
})
