import { useRef, useState } from 'react'
import { View as RNView, TouchableOpacity as RNTouchableOpacity, TextInput as RNTextInput, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// Hand-drawn "uneven sheet" frames for the whole app (Tony, 6 Oct 2026,
// style "C" — like the calendar sheet): four pen lines, no two sides the
// same length or parallel, crossing a little at the corners.
//
// SketchView / SketchTouchable / SketchTextInput are drop-ins for the
// react-native components. A box is redrawn when it is visibly framed:
//   - a border of 1pt or more (solid or dashed), or
//   - a solid fill with rounded corners (filled buttons, bubbles, pills).
// Its border / fill / rounding come off and the sketch is drawn in the same
// colours instead (fill behind the content, pen lines on top). Plain layout
// boxes are untouched. Pass sketch={false} to opt out of one box.

const PAD = 5

function rng(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function sheetPaths(w, h, seed) {
  const r = rng(seed)
  const k = Math.min(5, Math.max(1.5, Math.min(w, h) * 0.1))
  const j = () => (r() * 2 - 1) * k
  const c = [[PAD + j(), PAD + j()], [PAD + w + j(), PAD + j()], [PAD + w + j(), PAD + h + j()], [PAD + j(), PAD + h + j()]]
  const fill = `M ${c.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`
  const lines = []
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = c[(i + 1) % 4]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const L = Math.hypot(dx, dy) || 1
    const ux = dx / L
    const uy = dy / L
    const o1 = 1 + r() * 3
    const o2 = 1 + r() * 3
    const bow = (r() * 2 - 1) * 1.5
    const mx = (a[0] + b[0]) / 2 - uy * bow
    const my = (a[1] + b[1]) / 2 + ux * bow
    lines.push(`M ${(a[0] - ux * o1).toFixed(1)} ${(a[1] - uy * o1).toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${(b[0] + ux * o2).toFixed(1)} ${(b[1] + uy * o2).toFixed(1)}`)
  }
  return { fill, lines }
}

// Round things (avatars, round buttons) stay round, just drawn by hand.
function circlePaths(w, h, seed) {
  const r = rng(seed * 9973 + 7)
  const cx = PAD + w / 2
  const cy = PAD + h / 2
  const R = Math.min(w, h) / 2
  const n = 9
  const start = r() * Math.PI * 2
  const total = Math.PI * 2 + 0.12 + r() * 0.18
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * total
    const rr = R * (1 + (r() * 2 - 1) * 0.06)
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return { fill: d, lines: [d] }
}

function shapeFor(size, seed, radius) {
  const round = radius >= Math.min(size.w, size.h) / 2 - 1 && Math.abs(size.w - size.h) < 4
  return round ? circlePaths(size.w, size.h, seed) : sheetPaths(size.w, size.h, seed)
}

function isDark(color) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(color || ''))
  if (!m) return true
  const n = parseInt(m[1], 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum < 0.6
}

const STRIP = [
  'borderWidth', 'borderColor', 'borderRadius', 'backgroundColor', 'borderStyle',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
]

// Decide whether a style is a visible frame, and what to draw instead.
function analyse(style, sketch) {
  const flat = StyleSheet.flatten(style) || {}
  if (sketch === false) return { framed: false, flat }
  const bw = Number(flat.borderWidth) || 0
  const bg = flat.backgroundColor
  const solidBg = !!bg && bg !== 'transparent' && !String(bg).startsWith('rgba')
  const rounded = (Number(flat.borderRadius) || 0) >= 6
  const framed = bw >= 1 || (solidBg && rounded)
  if (!framed) return { framed: false, flat }
  const clean = { ...flat }
  for (const k of STRIP) delete clean[k]
  // The pen lines sit just outside the box; clipping would cut them off.
  if (clean.overflow === 'hidden') clean.overflow = 'visible'
  const dashed = flat.borderStyle === 'dashed' || flat.borderStyle === 'dotted'
  const stroke = bw >= 1 ? (flat.borderColor || '#1A1A1A') : (isDark(bg) ? bg : '#1A1A1A')
  const width = bw >= 1 ? Math.max(1.4, bw) : 1.8
  return { framed: true, flat, clean, fill: solidBg ? bg : null, stroke, width, dashed, radius: Number(flat.borderRadius) || 0 }
}

function useFrame(onLayout) {
  const seed = useRef(Math.floor(Math.random() * 1e6) + 1).current
  const [size, setSize] = useState(null)
  const handle = (e) => {
    const { width, height } = e.nativeEvent.layout
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height })
    onLayout?.(e)
  }
  return { seed, size, handle }
}

function Behind({ size, paths, fill }) {
  if (!size || !fill) return null
  return (
    <RNView pointerEvents="none" style={{ position: 'absolute', left: -PAD, top: -PAD, width: size.w + PAD * 2, height: size.h + PAD * 2 }}>
      <Svg width={size.w + PAD * 2} height={size.h + PAD * 2}><Path d={paths.fill} fill={fill} /></Svg>
    </RNView>
  )
}

function Lines({ size, paths, stroke, width, dashed }) {
  if (!size) return null
  return (
    <RNView pointerEvents="none" style={{ position: 'absolute', left: -PAD, top: -PAD, width: size.w + PAD * 2, height: size.h + PAD * 2 }}>
      <Svg width={size.w + PAD * 2} height={size.h + PAD * 2}>
        {paths.lines.map((d, i) => (
          <Path key={i} d={d} stroke={stroke} strokeWidth={i % 2 ? width : width + 0.6} fill="none" strokeLinecap="round" strokeDasharray={dashed ? '6 5' : undefined} />
        ))}
      </Svg>
    </RNView>
  )
}

export function SketchView({ style, children, sketch, onLayout, ...rest }) {
  const a = analyse(style, sketch)
  const f = useFrame(onLayout)
  if (!a.framed) return <RNView style={style} onLayout={onLayout} {...rest}>{children}</RNView>
  const paths = f.size ? shapeFor(f.size, f.seed, a.radius) : null
  return (
    <RNView style={a.clean} onLayout={f.handle} {...rest}>
      {paths ? <Behind size={f.size} paths={paths} fill={a.fill} /> : null}
      {children}
      {paths ? <Lines size={f.size} paths={paths} stroke={a.stroke} width={a.width} dashed={a.dashed} /> : null}
    </RNView>
  )
}

export function SketchTouchable({ style, children, sketch, onLayout, ...rest }) {
  const a = analyse(style, sketch)
  const f = useFrame(onLayout)
  if (!a.framed) return <RNTouchableOpacity style={style} onLayout={onLayout} {...rest}>{children}</RNTouchableOpacity>
  const paths = f.size ? shapeFor(f.size, f.seed, a.radius) : null
  return (
    <RNTouchableOpacity style={a.clean} onLayout={f.handle} {...rest}>
      {paths ? <Behind size={f.size} paths={paths} fill={a.fill} /> : null}
      {children}
      {paths ? <Lines size={f.size} paths={paths} stroke={a.stroke} width={a.width} dashed={a.dashed} /> : null}
    </RNTouchableOpacity>
  )
}

// Layout props stay on the outer box; text and padding stay on the input.
const OUTER = [
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth', 'alignSelf',
  'position', 'top', 'left', 'right', 'bottom', 'height', 'minHeight', 'maxHeight', 'zIndex',
]

// Gray caret and selection instead of the system blue (black/white/gray only).
export function SketchTextInput({ style, sketch, selectionColor = '#4A4A4A', cursorColor = '#1A1A1A', ...rest }) {
  rest = { selectionColor, cursorColor, ...rest }
  const a = analyse(style, sketch)
  const f = useFrame()
  if (!a.framed) return <RNTextInput style={style} {...rest} />
  const outer = {}
  const inner = { ...a.clean }
  for (const k of OUTER) {
    if (inner[k] !== undefined) { outer[k] = inner[k]; delete inner[k] }
  }
  if (outer.height !== undefined || outer.minHeight !== undefined || outer.flex !== undefined) inner.flexGrow = 1
  // Web: an <input> is position:static, and the absolutely placed paper
  // fill would paint OVER it and hide the typed text. Relative puts the
  // input back above the fill (native already stacks by child order).
  inner.position = 'relative'
  const paths = f.size ? shapeFor(f.size, f.seed, a.radius) : null
  return (
    <RNView style={outer} onLayout={f.handle}>
      {paths ? <Behind size={f.size} paths={paths} fill={a.fill} /> : null}
      <RNTextInput style={inner} {...rest} />
      {paths ? <Lines size={f.size} paths={paths} stroke={a.stroke} width={a.width} dashed={a.dashed} /> : null}
    </RNView>
  )
}

export default SketchView
